import { redirect } from "next/navigation";

// Redirect to discover page — playlists are shown there now
export default function PlaylistsRedirect() {
  redirect("/discover");
}
