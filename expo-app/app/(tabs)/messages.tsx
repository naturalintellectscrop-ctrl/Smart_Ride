// Messages tab — re-exports the conversation list so it's reachable from the
// tab bar. The screen itself lives in app/chat/index.tsx, which is also the
// route drivers and merchants reach (they have no tab bar).
//
// Both routes previously had their own full implementation over the same
// chat store — 874 lines for one list, drifting apart. Same shim pattern as
// (tabs)/wallet.tsx -> wallet/index.tsx.
export { default } from '../chat/index';
