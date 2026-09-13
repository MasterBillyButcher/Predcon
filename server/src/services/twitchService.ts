import { usersRepo } from "../lib/repositories.js";
import { ApiException } from "../lib/apiResponse.js";

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? "";
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI ?? "";

export const twitchConfigured = Boolean(
  TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET && TWITCH_REDIRECT_URI,
);

/**
 * TwitchService centralizes every point of contact with Twitch's API.
 * - getAuthorizeUrl() / exchangeCode() implement the real OAuth flow and
 *   are only exercised when TWITCH_CLIENT_ID/SECRET/REDIRECT_URI are set.
 * - When Twitch credentials are absent (local dev, this project as
 *   delivered), the app runs in demo mode: /login signs the visitor into a
 *   seeded demo account instead of redirecting to Twitch.
 * - CLIENT_SECRET and access/refresh tokens never leave this module —
 *   nothing here is imported by anything that ships to the browser.
 */
export const TwitchService = {
  isConfigured(): boolean {
    return twitchConfigured;
  },

  getAuthorizeUrl(state: string): string {
    if (!twitchConfigured) {
      throw new ApiException(503, "TWITCH_NOT_CONFIGURED", "Twitch OAuth is not configured.");
    }
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    url.searchParams.set("client_id", TWITCH_CLIENT_ID);
    url.searchParams.set("redirect_uri", TWITCH_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "user:read:email");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code: string) {
    if (!twitchConfigured) {
      throw new ApiException(503, "TWITCH_NOT_CONFIGURED", "Twitch OAuth is not configured.");
    }
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: TWITCH_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) {
      throw new ApiException(502, "TWITCH_TOKEN_ERROR", "Failed to exchange Twitch auth code.");
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    });
    if (!userRes.ok) {
      throw new ApiException(502, "TWITCH_USER_ERROR", "Failed to fetch Twitch user profile.");
    }
    const userJson = (await userRes.json()) as {
      data: Array<{ id: string; login: string; display_name: string; profile_image_url: string }>;
    };
    const twitchUser = userJson.data[0];
    if (!twitchUser) {
      throw new ApiException(502, "TWITCH_USER_ERROR", "Twitch returned no user profile.");
    }

    return usersRepo.upsertByTwitchId({
      twitchId: twitchUser.id,
      username: twitchUser.login,
      displayName: twitchUser.display_name,
      profileImageUrl: twitchUser.profile_image_url,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
    });
  },
};
