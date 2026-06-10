import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateModule } from '@ngx-translate/core';
import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { AuthService } from './core/services/auth.service';
import { TranslationService } from './core/services/translation.service';

function initApp(authService: AuthService, translationService: TranslationService) {
  return async () => {
    await Promise.all([
      translationService.init(() => authService.isAuthenticated()),
      authService.loadCurrentUser(),
    ]);
    const user = authService.currentUser();
    await translationService.applyProfileLanguage(user?.language ?? null);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    importProvidersFrom(TranslateModule.forRoot()),
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [AuthService, TranslationService],
      multi: true,
    },
  ],
};
