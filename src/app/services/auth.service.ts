import { Injectable } from '@angular/core'
import { AuthResponse, createClient, OAuthResponse, SupabaseClient, User } from '@supabase/supabase-js'
import { BehaviorSubject, debounce, Observable, timer } from 'rxjs'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient
  private currentUser = new BehaviorSubject<User | undefined>(undefined)

  constructor() {
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

  getCurrentUser(): Observable<User | undefined> {
    return this.currentUser.asObservable().pipe(debounce(() => timer(200))) // TODO workaround for multiple subscribe
  }

  getCurrentUserId(): string | null {
    if (this.currentUser.value) {
      return (this.currentUser.value as User).id
    } else {
      return null
    }
  }

  signUp(credentials: { email: string, password: string }) {
    return this.supabase.auth.signUp(credentials)
  }

  signIn(credentials: { email: string, password: string }): Promise<AuthResponse> {
    return this.supabase.auth.signInWithPassword(credentials)
  }

  signInWithEmail(email: string): Promise<AuthResponse> {
    return this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:8100/login",
      }
    })
  }

  signInWithFacebook(): Promise<OAuthResponse> {
    return this.supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: "http://localhost:8100/login"
      }
    })
  }

  signInWithGoogle(): Promise<OAuthResponse> {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: "http://localhost:8100/login"
      }
    })
  }
  
  sendPwReset(email: string): Promise<any> {
    return this.supabase.auth.resetPasswordForEmail(email)
  }

  signOut(): Promise<any> {
    return this.supabase.auth.signOut()
  }
}
