import request from 'supertest';
import {
  setupTestDB,
  closeTestDB,
  seedUser,
  seedGroup,
  createTestToken,
  TestUser,
} from './helpers';
import { buildTestApp } from './test-app';
import type { Express } from 'express';

let app: Express;
let user1: TestUser;
let token1: string;

beforeAll(async () => {
  const db = await setupTestDB();
  app = buildTestApp(db);
});

beforeEach(async () => {
  const db = (await import('./helpers')).getTestDB();
  await db.run('DELETE FROM group_members');
  await db.run('DELETE FROM groups_table');
  await db.run('DELETE FROM users');

  user1 = await seedUser({ name: 'Alice' });
  token1 = createTestToken(user1);
});

afterAll(async () => {
  await closeTestDB();
});

// ── Auth ─────────────────────────────────────────────

describe('Groups - Authentication', () => {
  it('should return 401 without token on GET /groups/mine', async () => {
    const res = await request(app).get('/groups/mine');
    expect(res.status).toBe(401);
  });

  it('should return 403 with invalid token on POST /groups', async () => {
    const res = await request(app).post('/groups').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(403);
  });
});

// ── GET /groups/mine ────────────────────────────────

describe('GET /groups/mine', () => {
  it('should return null when user has no group', async () => {
    const res = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('should return the group when user belongs to one', async () => {
    const groupId = await seedGroup([user1.id]);

    const res = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(groupId);
    expect(res.body.users).toContain(user1.id);
  });

  it('should list all members of the group', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    await seedGroup([user1.id, user2.id]);

    const res = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token1}`);

    expect(res.body.users).toHaveLength(2);
    expect(res.body.users).toContain(user1.id);
    expect(res.body.users).toContain(user2.id);
  });
});

// ── POST /groups ────────────────────────────────────

describe('POST /groups', () => {
  it('should create a new group with the creator as member', async () => {
    const res = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.users).toEqual([user1.id]);
  });

  it('should persist the created group', async () => {
    await request(app).post('/groups').set('Authorization', `Bearer ${token1}`).send({});

    const check = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token1}`);

    expect(check.body).not.toBeNull();
    expect(check.body.users).toContain(user1.id);
  });
});

// ── POST /groups/:id/join ───────────────────────────

describe('POST /groups/:id/join', () => {
  it('should add a user to an existing group', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const token2 = createTestToken(user2);
    const groupId = await seedGroup([user1.id]);

    const res = await request(app)
      .post(`/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token2}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.users).toContain(user1.id);
    expect(res.body.users).toContain(user2.id);
  });

  it('should be idempotent (joining twice is fine)', async () => {
    const groupId = await seedGroup([user1.id]);

    const res = await request(app)
      .post(`/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    expect(res.status).toBe(200);
    // Still only one member (Alice)
    expect(res.body.users).toHaveLength(1);
  });

  it('should allow up to many members', async () => {
    const groupId = await seedGroup([user1.id]);

    for (let i = 0; i < 5; i++) {
      const u = await seedUser({ name: `User${i}` });
      await request(app)
        .post(`/groups/${groupId}/join`)
        .set('Authorization', `Bearer ${createTestToken(u)}`)
        .send({});
    }

    const res = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token1}`);

    expect(res.body.users).toHaveLength(6); // Alice + 5
  });
});

// ── POST /groups/:id/leave ──────────────────────────

describe('POST /groups/:id/leave', () => {
  it('should remove the user from the group', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const groupId = await seedGroup([user1.id, user2.id]);

    const res = await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.users).not.toContain(user1.id);
    expect(res.body.users).toContain(user2.id);
  });

  it('should return empty users array if last member leaves', async () => {
    const groupId = await seedGroup([user1.id]);

    const res = await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(0);
  });

  it("should no longer be the user's group after leaving", async () => {
    const groupId = await seedGroup([user1.id]);

    await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    const check = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token1}`);

    expect(check.body).toBeNull();
  });

  it('should not affect other members when one leaves', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const user3 = await seedUser({ name: 'Charlie' });
    const token2 = createTestToken(user2);
    const groupId = await seedGroup([user1.id, user2.id, user3.id]);

    await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${token1}`)
      .send({});

    const res = await request(app).get('/groups/mine').set('Authorization', `Bearer ${token2}`);

    expect(res.body.users).toHaveLength(2);
    expect(res.body.users).toContain(user2.id);
    expect(res.body.users).toContain(user3.id);
  });
});

// ── Group + Planning integration ────────────────────

describe('Group + Planning integration', () => {
  it('group member should see plans of all members', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const token2 = createTestToken(user2);

    // Create a group
    const createRes = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token1}`)
      .send({});
    const groupId = createRes.body.id;

    // Bob joins the group
    await request(app)
      .post(`/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token2}`)
      .send({});

    // Both add to the same week
    const db = (await import('./helpers')).getTestDB();
    const crypto = await import('crypto');
    const recipe1 = { id: crypto.randomUUID(), name: 'R1' };
    const recipe2 = { id: crypto.randomUUID(), name: 'R2' };
    await db.run(
      'INSERT INTO recipes (id, user_id, name) VALUES (?, ?, ?)',
      recipe1.id,
      user1.id,
      recipe1.name,
    );
    await db.run(
      'INSERT INTO recipes (id, user_id, name) VALUES (?, ?, ?)',
      recipe2.id,
      user2.id,
      recipe2.name,
    );

    await request(app)
      .post('/planning')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipe_id: recipe1.id, recipe_name: 'R1', week: '2026-03-02', day: 'MON' });

    await request(app)
      .post('/planning')
      .set('Authorization', `Bearer ${token2}`)
      .send({ recipe_id: recipe2.id, recipe_name: 'R2', week: '2026-03-02', day: 'TUE' });

    // Alice sees both via group
    const res = await request(app)
      .get('/planning/2026-03-02')
      .query({ groupId })
      .set('Authorization', `Bearer ${token1}`);

    expect(res.body.recipes).toHaveLength(2);
  });
});
