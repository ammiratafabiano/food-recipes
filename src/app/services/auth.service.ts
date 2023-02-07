import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { BehaviorSubject, Observable } from 'rxjs'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient
  private currentUser = new BehaviorSubject<User | undefined>(undefined)

  constructor(private router: Router) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey)

    this.supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('SET USER')

        this.currentUser.next(sess?.user)
      } else {
        this.currentUser.next(undefined)
      }
    })

    // Trigger initial session load
    this.loadUser()
  }

  async loadUser() {
    if (this.currentUser.value) {
      // User is already set, no need to do anything else
      return
    }
    const user = await this.supabase.auth.getUser()

    if (user.data.user) {
      this.currentUser.next(user.data.user)
    } else {
      this.currentUser.next(undefined)
    }
  }

  signUp(credentials: { email: string, password: string }) {
    return this.supabase.auth.signUp(credentials)
  }

  signIn(credentials: { email: string, password: string }) {
    return this.supabase.auth.signInWithPassword(credentials)
  }

  sendPwReset(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email)
  }

  async signOut() {
    await this.supabase.auth.signOut()
    this.router.navigateByUrl('/', { replaceUrl: true })
  }

  getCurrentUser(): Observable<User | undefined> {
    return this.currentUser.asObservable()
  }

  getCurrentUserId(): string | null {
    if (this.currentUser.value) {
      return (this.currentUser.value as User).id
    } else {
      return null
    }
  }

  signInWithEmail(email: string) {
    return this.supabase.auth.signInWithOtp({ email })
  }
}