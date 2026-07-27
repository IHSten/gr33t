import type { Card } from "./card";

export const mockCard: Card = {
  id: "sample-card-123",
  title: "Connect with me on:",
  description: null,
  connections: [
    {
      type: "X",
      details: {
        handle: "@johndoe_dev",
        imageUrl: "https://example.com/images/x-logo.png",
        link: "https://x.com/johndoe_dev",
      },
    },
    {
      type: "LinkedIn",
      details: {
        handle: "John Doe",
        imageUrl: "https://example.com/images/linkedin-logo.png",
        link: "https://linkedin.com/in/johndoe",
      },
    },
    {
      type: "Instagram",
      details: {
        handle: "@johndoe.photos",
        imageUrl: "https://example.com/images/instagram-logo.png",
        link: "https://instagram.com/johndoe.photos",
      },
    },
    {
      type: "Email",
      details: {
        handle: "john.doe@example.com",
        imageUrl: "https://example.com/images/email-icon.png",
        link: "mailto:john.doe@example.com",
      },
    },
    {
      type: "Phone",
      details: {
        handle: "+1 (555) 123-4567",
        imageUrl: "https://example.com/images/phone-icon.png",
        link: "tel:+15551234567",
      },
    },
    {
      type: "Website",
      details: {
        handle: "johndoe.dev",
        imageUrl: "https://example.com/images/website-icon.png",
        link: "https://johndoe.dev",
      },
    },
    {
      type: "YouTube",
      details: {
        handle: "John Doe Tech",
        imageUrl: "https://example.com/images/youtube-logo.png",
        link: "https://youtube.com/@johndoetech",
      },
    },
    {
      type: "Discord",
      details: {
        handle: "johndoe#1337",
        imageUrl: "https://example.com/images/discord-logo.png",
        link: "https://discord.gg/johndoe",
      },
    },
  ],
};
