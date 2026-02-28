import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Feature flags that can be toggled.
 * Add new flags here as needed.
 */
export enum FeatureFlag {
  /** Discover page (explore recipes from all users) */
  Discover = 'discover',
  /** Social features (follow/unfollow, user profiles, user list) */
  Social = 'social',
}

interface FeatureFlagConfig {
  /** Whether the feature is enabled globally (for all users) */
  enabledGlobally: boolean;
  /** List of user IDs that have access even if not enabled globally */
  allowedUserIds: string[];
}

/**
 * Service to manage feature flags.
 * Currently checks flags client-side based on user ID.
 * Can be extended to fetch flags from a remote config endpoint.
 */
@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private readonly authService = inject(AuthService);

  /**
   * Feature flag configuration.
   * - Set `enabledGlobally: true` to enable for everyone.
   * - Add user IDs to `allowedUserIds` to enable for specific beta testers.
   *
   * In production, `enabledGlobally: false` means only allowedUserIds can see the feature.
   * In development (non-production), all flags are enabled by default.
   */
  private readonly flags: Record<FeatureFlag, FeatureFlagConfig> = {
    [FeatureFlag.Discover]: {
      enabledGlobally: false,
      allowedUserIds: [
        // Add your user ID here to test:
        // 'your-user-id-here',
      ],
    },
    [FeatureFlag.Social]: {
      enabledGlobally: false,
      allowedUserIds: [
        // Add your user ID here to test:
        // 'your-user-id-here',
      ],
    },
  };

  /**
   * Check if a feature flag is enabled for the current user.
   *
   * Rules:
   * 1. In non-production environments, all flags are always enabled.
   * 2. If the flag is enabled globally, it's enabled for everyone.
   * 3. If the current user's ID is in the allowedUserIds list, it's enabled.
   * 4. Otherwise, it's disabled.
   */
  isEnabled(flag: FeatureFlag): boolean {
    // In development, all flags are enabled
    if (!environment.production) {
      return false;
    }

    const config = this.flags[flag];
    if (!config) return false;

    // Check global flag
    if (config.enabledGlobally) return true;

    // Check user-specific access
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && config.allowedUserIds.includes(currentUser.id)) {
      return true;
    }

    return false;
  }

  /**
   * Enable a feature flag globally at runtime.
   * Useful for remote config updates.
   */
  enableGlobally(flag: FeatureFlag): void {
    if (this.flags[flag]) {
      this.flags[flag].enabledGlobally = true;
    }
  }

  /**
   * Add a user ID to the allowed list for a specific flag at runtime.
   */
  addAllowedUser(flag: FeatureFlag, userId: string): void {
    if (this.flags[flag] && !this.flags[flag].allowedUserIds.includes(userId)) {
      this.flags[flag].allowedUserIds.push(userId);
    }
  }
}
