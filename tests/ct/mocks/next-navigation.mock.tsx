// Minimal stand-in for next/navigation in the Vite-bundled component-test environment —
// records the last push/replace target on window instead of performing real navigation.
export function useRouter() {
  return {
    push: (url: string) => {
      (window as unknown as { __lastPush?: string }).__lastPush = url;
    },
    replace: (url: string) => {
      (window as unknown as { __lastPush?: string }).__lastPush = url;
    },
  };
}
