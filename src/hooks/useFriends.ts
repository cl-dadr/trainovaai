import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FriendProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  fitness_level: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile: FriendProfile;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (!friendships) { setLoading(false); return; }

    const otherIds = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, fitness_level")
      .in("user_id", otherIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enriched = friendships.map(f => {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
      return { ...f, profile: profileMap.get(otherId) as FriendProfile };
    }).filter(f => f.profile);

    setFriends(enriched.filter(f => f.status === "accepted"));
    setPendingRequests(enriched.filter(f => f.status === "pending" && f.friend_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const searchUsers = async (query: string): Promise<FriendProfile[]> => {
    if (!user || query.length < 2) return [];
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, fitness_level")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq("user_id", user.id)
      .limit(10);
    return (data || []) as FriendProfile[];
  };

  const sendRequest = async (friendId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: friendId,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505") toast.error("Request already sent!");
      else toast.error("Failed to send request");
      return;
    }
    toast.success("Friend request sent! 🤝");
    fetchFriends();
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    toast.success("Friend added! 🎉");
    fetchFriends();
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    toast.success("Request declined");
    fetchFriends();
  };

  return { friends, pendingRequests, loading, searchUsers, sendRequest, acceptRequest, declineRequest };
}
