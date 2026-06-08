# Eval Log — locale-switch-refactor

<!-- Appended by evaluator subagent after each N.E EVAL run -->

- group: 1
  attempt: 1
  scores: {spec: 95, runtime: 100, code: 92}
  total: 96.4
  status: PASS
  findings:
    - "spec: missing input validation for language values (accepts any string, not just 'en'/'zh')"
    - "code: PATCH endpoint uses untyped Map<String, String> instead of dedicated DTO"
    - "code: no null/missing body validation on PATCH endpoint"
  fix_tasks: []

- group: 2
  attempt: 1
  scores: {spec: 80, runtime: 30, code: 35}
  total: 51
  status: RETRY
  findings:
    - "code: CRITICAL — applyProfileLanguage calls async loadLanguage() without await (line 49 translation.service.ts), violates contract requirement to 'apply that language' immediately"
    - "code: CRITICAL — initialization order race condition — isAuthFn callback set in initTranslation but loadCurrentUser() may call applyProfileLanguage() before initTranslation runs"
    - "runtime: broader test suite cascade failures indicate unresolved DI issues from AuthService←TranslationService injection"
    - "code: no error handling in applyProfileLanguage if i18n load fails"
  fix_tasks:
    - "2.F1 FIX — make applyProfileLanguage async and await loadLanguage() to ensure language is actually applied before method returns"
    - "2.F2 FIX — defer applyProfileLanguage call until after initTranslation completes, OR move isAuthFn initialization earlier (e.g., in constructor with () => false default)"
    - "2.F3 FIX — add .catch() error handling to loadLanguage calls in applyProfileLanguage to silently handle i18n fetch failures"
    - "2.F4 VERIFY — run full frontend test suite (npx ng test --no-watch) and confirm no new failures beyond pre-existing baseline (14 failing)"

- group: 2
  attempt: 2
  scores: {spec: 98, runtime: 95, code: 88}
  total: 94
  status: PASS
  findings:
    - "spec: all 5 SHALL statements compliant — applyProfileLanguage called after loadCurrentUser, language application logic correct, fire-and-forget PATCH pattern with error suppression working"
    - "runtime: ng build --configuration=production succeeds with no DI errors; 94 tests pass overall (vs 91 in attempt 1); no new test failures introduced; translation.service.spec.ts and auth.service.spec.ts tests included in passing count"
    - "code: no circular DI maintained (AuthService ⊘ TranslationService); fire-and-forget correctly implemented with pipe(catchError(() => EMPTY)).subscribe(); error handling added to loadLanguage calls"
    - "code: Promise.all([init, loadCurrentUser]) is spec-compliant but Promise.all ordering is implicit (could use sequential awaits for clarity); silent error suppression on language loads matches spec but hides network failures from user"
  fix_tasks: []
