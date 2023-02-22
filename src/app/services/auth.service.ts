import { Injectable } from '@angular/core'
import { AuthResponse, createClient, OAuthResponse, SupabaseClient, User } from '@supabase/supabase-js'
import { BehaviorSubject, debounce, Observable, of, timer } from 'rxjs'
import { environment } from '../../environments/environment'
import { SessionService } from './session.service'

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient
  private currentUser = new BehaviorSubject<User | undefined>(undefined)

  constructor(
    private readonly sessionService: SessionService
  ) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey)

    this.supabase.auth.onAuthStateChange((event, sess) => {
      let user;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        user = sess?.user;
      }
      this.setCurrentUser(user);
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

    this.setCurrentUser(user.data.user || undefined);
  }

  private setCurrentUser(user: User | undefined) {
    if (user) {
      this.currentUser.next(user)
      this.sessionService.userData = {
        id: user.id,
        name: user.user_metadata.full_name,
        email: user.user_metadata.email,
        avatar_url: user.user_metadata.avatar_url
      }
    } else {
      this.currentUser.next(undefined);
      this.sessionService.userData = undefined;
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
        emailRedirectTo: environment.siteUrl,
      }
    })
  }

  signInWithFacebook(): Promise<OAuthResponse> {
    return this.supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: environment.siteUrl
      }
    })
  }

  signInWithGoogle(): Promise<OAuthResponse> {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: environment.siteUrl
      }
    })
  }
  
  sendPwReset(email: string): Promise<any> {
    return this.supabase.auth.resetPasswordForEmail(email)
  }

  resetUser() {
    this.setCurrentUser(undefined);
  }

  signOut(): Promise<any> {
    this.resetUser();
    return this.supabase.auth.signOut()
  }
}
