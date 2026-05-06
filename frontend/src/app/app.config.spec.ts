import { appConfig } from './app.config';

describe('appConfig', () => {
  it('registers provideAnimationsAsync', () => {
    function flatten(providers: any[]): any[] {
      return providers.flatMap(p => p?.ɵproviders ? flatten(p.ɵproviders) : [p]);
    }
    const flat = flatten(appConfig.providers as any[]);
    const hasAnimations = flat.some(
      p => p?.useValue === 'BrowserAnimations' || p?.useValue === 'NoopAnimations'
    );
    expect(hasAnimations).toBe(true);
  });
});
