# RIFF <small>Let others finish your thoughts!</small>

## GIF search

Create a GIPHY API key at https://developers.giphy.com/dashboard/ and set it as `NEXT_PUBLIC_GIPHY_API_KEY` in `.env.local` for post GIFs. Add a separate key as `NEXT_PUBLIC_GIPHY_CHAT_API_KEY` for messaging; GIPHY asks apps to use different keys for separate sections. Set both in the Vercel project environment for deployments. Restart or redeploy after adding keys.

Run `supabase/riff-giphy-messages.sql` in Supabase to enable GIF messages in existing chats.
