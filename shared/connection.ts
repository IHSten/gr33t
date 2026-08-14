// Single source of truth: the type is derived from this array (see below), so
// adding or removing an entry updates ConnectionType everywhere automatically.
export const CONNECTION_TYPES = [
  "X",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "Twitch",
  "Discord",
  "Reddit",
  "Pinterest",
  "Snapchat",
  "WhatsApp",
  "Signal",
  "Patreon",
  "GitHub",
  "GitLab",
  "Stack Overflow",
  "Dev.to",
  "Medium",
  "CodePen",
  "Hugging Face",
  "npm",
  "Bluesky",
  "Mastodon",
  "Phone",
  "Email",
  "Website",
] as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export type Connection = {
  type: ConnectionType;
  details: {
    handle: string;
    imageUrl: string;
    link: string;
  };
};

export const CONNECTION_EXAMPLES: Record<
  ConnectionType,
  { handle: string; link: string }
> = {
  X: { handle: "@username", link: "https://x.com/username" },
  LinkedIn: { handle: "username", link: "https://linkedin.com/in/username" },
  Instagram: { handle: "@username", link: "https://instagram.com/username" },
  Facebook: { handle: "username", link: "https://facebook.com/username" },
  TikTok: { handle: "@username", link: "https://tiktok.com/@username" },
  YouTube: { handle: "@username", link: "https://youtube.com/@username" },
  Twitch: { handle: "username", link: "https://twitch.tv/username" },
  Discord: { handle: "username", link: "https://discord.gg/invite" },
  Reddit: { handle: "u/username", link: "https://reddit.com/user/username" },
  Pinterest: { handle: "username", link: "https://pinterest.com/username" },
  Snapchat: { handle: "username", link: "https://snapchat.com/add/username" },
  WhatsApp: { handle: "+1 555 555 0123", link: "https://wa.me/15555550123" },
  Signal: {
    handle: "+1 555 555 0123",
    link: "https://signal.me/#p/+15555550123",
  },
  Patreon: { handle: "username", link: "https://patreon.com/username" },
  GitHub: { handle: "username", link: "https://github.com/username" },
  GitLab: { handle: "username", link: "https://gitlab.com/username" },
  "Stack Overflow": {
    handle: "username",
    link: "https://stackoverflow.com/users/1234567/username",
  },
  "Dev.to": { handle: "@username", link: "https://dev.to/username" },
  Medium: { handle: "@username", link: "https://medium.com/@username" },
  CodePen: { handle: "username", link: "https://codepen.io/username" },
  "Hugging Face": {
    handle: "username",
    link: "https://huggingface.co/username",
  },
  npm: { handle: "~username", link: "https://npmjs.com/~username" },
  Bluesky: {
    handle: "@username.bsky.social",
    link: "https://bsky.app/profile/username.bsky.social",
  },
  Mastodon: {
    handle: "@username@mastodon.social",
    link: "https://mastodon.social/@username",
  },
  Phone: { handle: "+1 555 555 0123", link: "tel:+15555550123" },
  Email: { handle: "you@example.com", link: "mailto:you@example.com" },
  Website: { handle: "example.com", link: "https://example.com" },
};
