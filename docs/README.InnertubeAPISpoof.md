**READ BEFORE**:

- AI generated, but reviewed by me.
- While it may not be 100% accurate, I have attempted to verify all the details.
- The original implementation is from the [googlevideo official example](https://github.com/LuanRT/googlevideo/tree/main/examples/sabr-shaka-example). Everything written here explains the modifications made to make it work in an Electron app.
- Almost everything here relates to `electron/main` file

### YouTube Internal API Integration & Traffic Interception Strategy

This application implements a custom networking layer within the Electron Main Process to integrate the native YouTube client (via `youtubei.js` and `shaka-player`) while simultaneously supporting standard YouTube IFrames. The system bypasses Google's BotGuard fingerprinting and CORS restrictions through the following architectural decisions:

1. **Runtime Environment Emulation & Identity Spoofing**: To circumvent BotGuard's "Soft Fail" mechanisms (which result in empty [PO tokens](https://github.com/LuanRT/BgUtils?tab=readme-ov-file#when-to-use-a-po-token)), the Electron environment is masked to appear as a standard browser. This is achieved by disabling the AutomationControlled Blink feature via `app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')`. The network stack also injects specific `sec-ch-ua` ([Client Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Client_hints)) headers to align the HTTP request signature with the emulated User-Agent (e.g., Chrome v120), preventing server-side detection of the Electron runtime.

2. **Context-Aware Origin Manipulation**: The `onBeforeSendHeaders` interceptor implements a split-horizon strategy for the Origin header. For **Video Streams** (googlevideo.com) the Origin is rewritten to https://www.youtube.com. This is required to bypass server-side `403 Forbidden` blocks on raw video segments. Hovewer for **BotGuard** (/api/jnn/) the Origin is preserved as the localhost. This prevents "Man-in-the-Middle" detection, as the BotGuard VM encrypts the client-side location into its payload; a mismatch between the encrypted payload and the HTTP header would cause token generation failure.

3. **Dynamic CORS Relaxation**: Since the BotGuard endpoint requires the native Origin (localhost) but the application runs in a browser-like environment, the ``onHeadersReceived`` interceptor modifies response headers in-flight. It strips restrictive CORS headers sent by Google and injects permissive directives ``(Access-Control-Allow-Origin: \* with Access-Control-Allow-Credentials: true)``. This allows the Renderer process to access opaque resources returned by the API without triggering browser security violations.

4. **Traffic Differentiation (IFrame Coexistence)**: To prevent breaking standard embedded YouTube players (which require strict CORS adherence for credentialed requests), the interception logic filters traffic based on the `c` (Client) URL parameter. Requests originating from `WEB_EMBEDDED_PLAYER` bypass all header manipulations and CORS overrides, allowing IFrames to function natively. Only traffic identified as the custom client (`c=WEB`) undergoes the spoofing and CORS relaxation process.

5. **Official example's custom fetch implementation fix**: The custom fetchFunction used by the internal API adapter was patched to enforce `credentials: 'include'`, ensuring session cookies (e.g., `VISITOR_INFO1_LIVE`) are transmitted during token generation. Additionally, the function was corrected to explicitly preserve HTTP methods (specifically POST) when handling Request objects, preventing the loss of request bodies during the internal serialization process used by `youtubei.js`.
