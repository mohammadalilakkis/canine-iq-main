import * as Router from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/modal`; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)/activity'}` | `/activity`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)/intelligence'}` | `/intelligence`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)/profile'}` | `/profile`; params?: Router.UnknownInputParams }
        | { pathname: `/add-activity`; params?: Router.UnknownInputParams }
        | { pathname: `/add-health-note`; params?: Router.UnknownInputParams }
        | { pathname: `/app-settings`; params?: Router.UnknownInputParams }
        | { pathname: `/auth`; params?: Router.UnknownInputParams }
        | { pathname: `/coach-activity`; params?: Router.UnknownInputParams }
        | { pathname: `/coach-settings`; params?: Router.UnknownInputParams }
        | { pathname: `/edit-profile`; params?: Router.UnknownInputParams }
        | { pathname: `/generate-report`; params?: Router.UnknownInputParams }
        | { pathname: `/help-faq`; params?: Router.UnknownInputParams }
        | { pathname: `/login`; params?: Router.UnknownInputParams }
        | { pathname: `/manage-breeds`; params?: Router.UnknownInputParams }
        | { pathname: `/manage-goals`; params?: Router.UnknownInputParams }
        | { pathname: `/privacy-policy`; params?: Router.UnknownInputParams }
        | { pathname: `/select-breed`; params?: Router.UnknownInputParams }
        | { pathname: `/sign-up`; params?: Router.UnknownInputParams }
        | { pathname: `/terms-of-use`; params?: Router.UnknownInputParams }
        | { pathname: `/+not-found`; params: Router.UnknownInputParams & {} };
      hrefOutputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownOutputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownOutputParams }
        | { pathname: `/modal`; params?: Router.UnknownOutputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(tabs)/activity'}` | `/activity`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(tabs)/intelligence'}` | `/intelligence`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(tabs)/profile'}` | `/profile`; params?: Router.UnknownOutputParams }
        | { pathname: `/add-activity`; params?: Router.UnknownOutputParams }
        | { pathname: `/add-health-note`; params?: Router.UnknownOutputParams }
        | { pathname: `/app-settings`; params?: Router.UnknownOutputParams }
        | { pathname: `/auth`; params?: Router.UnknownOutputParams }
        | { pathname: `/coach-activity`; params?: Router.UnknownOutputParams }
        | { pathname: `/coach-settings`; params?: Router.UnknownOutputParams }
        | { pathname: `/edit-profile`; params?: Router.UnknownOutputParams }
        | { pathname: `/generate-report`; params?: Router.UnknownOutputParams }
        | { pathname: `/help-faq`; params?: Router.UnknownOutputParams }
        | { pathname: `/login`; params?: Router.UnknownOutputParams }
        | { pathname: `/manage-breeds`; params?: Router.UnknownOutputParams }
        | { pathname: `/manage-goals`; params?: Router.UnknownOutputParams }
        | { pathname: `/privacy-policy`; params?: Router.UnknownOutputParams }
        | { pathname: `/select-breed`; params?: Router.UnknownOutputParams }
        | { pathname: `/sign-up`; params?: Router.UnknownOutputParams }
        | { pathname: `/terms-of-use`; params?: Router.UnknownOutputParams }
        | { pathname: `/+not-found`; params: Router.UnknownOutputParams & {} };
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/modal${`?${string}` | `#${string}` | ''}`
        | `/_sitemap${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}${`?${string}` | `#${string}` | ''}`
        | `/${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)/activity'}${`?${string}` | `#${string}` | ''}`
        | `/activity${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)/intelligence'}${`?${string}` | `#${string}` | ''}`
        | `/intelligence${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)/profile'}${`?${string}` | `#${string}` | ''}`
        | `/profile${`?${string}` | `#${string}` | ''}`
        | `/add-activity${`?${string}` | `#${string}` | ''}`
        | `/add-health-note${`?${string}` | `#${string}` | ''}`
        | `/app-settings${`?${string}` | `#${string}` | ''}`
        | `/auth${`?${string}` | `#${string}` | ''}`
        | `/coach-activity${`?${string}` | `#${string}` | ''}`
        | `/coach-settings${`?${string}` | `#${string}` | ''}`
        | `/edit-profile${`?${string}` | `#${string}` | ''}`
        | `/generate-report${`?${string}` | `#${string}` | ''}`
        | `/help-faq${`?${string}` | `#${string}` | ''}`
        | `/login${`?${string}` | `#${string}` | ''}`
        | `/manage-breeds${`?${string}` | `#${string}` | ''}`
        | `/manage-goals${`?${string}` | `#${string}` | ''}`
        | `/privacy-policy${`?${string}` | `#${string}` | ''}`
        | `/select-breed${`?${string}` | `#${string}` | ''}`
        | `/sign-up${`?${string}` | `#${string}` | ''}`
        | `/terms-of-use${`?${string}` | `#${string}` | ''}`
        | `/+not-found${`?${string}` | `#${string}` | ''}`
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/modal`; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)/activity'}` | `/activity`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)/intelligence'}` | `/intelligence`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(tabs)/profile'}` | `/profile`; params?: Router.UnknownInputParams }
        | { pathname: `/add-activity`; params?: Router.UnknownInputParams }
        | { pathname: `/add-health-note`; params?: Router.UnknownInputParams }
        | { pathname: `/app-settings`; params?: Router.UnknownInputParams }
        | { pathname: `/auth`; params?: Router.UnknownInputParams }
        | { pathname: `/coach-activity`; params?: Router.UnknownInputParams }
        | { pathname: `/coach-settings`; params?: Router.UnknownInputParams }
        | { pathname: `/edit-profile`; params?: Router.UnknownInputParams }
        | { pathname: `/generate-report`; params?: Router.UnknownInputParams }
        | { pathname: `/help-faq`; params?: Router.UnknownInputParams }
        | { pathname: `/login`; params?: Router.UnknownInputParams }
        | { pathname: `/manage-breeds`; params?: Router.UnknownInputParams }
        | { pathname: `/manage-goals`; params?: Router.UnknownInputParams }
        | { pathname: `/privacy-policy`; params?: Router.UnknownInputParams }
        | { pathname: `/select-breed`; params?: Router.UnknownInputParams }
        | { pathname: `/sign-up`; params?: Router.UnknownInputParams }
        | { pathname: `/terms-of-use`; params?: Router.UnknownInputParams }
        | { pathname: `/+not-found`; params: Router.UnknownInputParams & {} };
    }
  }
}
