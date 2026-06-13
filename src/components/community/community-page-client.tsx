"use client";

import { CommunityPostType, SubscriptionPlan } from "@prisma/client";
import { useDeferredValue, useMemo, useState } from "react";

import { PageHero } from "@/components/app-shell/page-hero";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCommunity } from "@/features/community/hooks";
import { useProjects } from "@/features/projects/hooks";

const postTypeOptions: Array<{ value: CommunityPostType; label: string }> = [
  { value: CommunityPostType.GENERAL, label: "General" },
  { value: CommunityPostType.MARKET, label: "Market" },
  { value: CommunityPostType.IDEA, label: "Idea" },
  { value: CommunityPostType.ART, label: "Art" },
  { value: CommunityPostType.SHOWCASE, label: "Showcase" },
  { value: CommunityPostType.HELP, label: "Help" }
];

export function CommunityPageClient({
  canAccessFeed,
  canAccessRanking,
  subscriptionPlan
}: {
  canAccessFeed: boolean;
  canAccessRanking: boolean;
  subscriptionPlan: SubscriptionPlan;
}) {
  const query = useCommunity(canAccessFeed);
  const projectsQuery = useProjects();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CommunityPostType | "ALL">("ALL");
  const [sortMode, setSortMode] = useState<"recent" | "liked">("recent");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [form, setForm] = useState<{
    title: string;
    content: string;
    type: CommunityPostType;
    projectId: string;
    tags: string;
  }>({
    title: "",
    content: "",
    type: CommunityPostType.GENERAL,
    projectId: "none",
    tags: ""
  });
  const isPro = subscriptionPlan === SubscriptionPlan.PRO;
  const feed = query.data?.feed ?? [];
  const deferredSearch = useDeferredValue(search);
  const canPublishPost = form.title.trim().length >= 2 && form.content.trim().length > 0;

  async function createPost() {
    setFeedback(null);

    if (!canPublishPost) {
      setFeedback("Add a title and write something before publishing.");
      return;
    }

    setIsSubmitting(true);
    const payload = new FormData();
    payload.append("title", form.title.trim());
    payload.append("content", form.content.trim());
    payload.append("type", form.type);
    payload.append("projectId", form.projectId);
    payload.append("tags", form.tags);

    for (const file of mediaFiles) {
      payload.append("media", file);
    }

    const response = await fetch("/api/community", {
      method: "POST",
      body: payload
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to publish post.");
      return;
    }

    setForm({
      title: "",
      content: "",
      type: CommunityPostType.GENERAL,
      projectId: "none",
      tags: ""
    });
    setMediaFiles([]);
    setFeedback("Post published.");
    await query.refetch();
  }

  function updateMediaFiles(files: FileList | null) {
    setFeedback(null);

    if (!files) {
      setMediaFiles([]);
      return;
    }

    const selected = Array.from(files).slice(0, 4);
    const invalidFile = selected.find((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024);

    if (invalidFile) {
      setFeedback("Use only images up to 8 MB.");
      return;
    }

    setMediaFiles(selected);
  }

  async function toggleLike(postId: string) {
    const response = await fetch(`/api/community/${postId}/like`, {
      method: "POST"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to update reaction.");
      return;
    }

    await query.refetch();
  }

  async function deletePost(postId: string) {
    const response = await fetch(`/api/community/${postId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to delete post.");
      return;
    }

    setFeedback("Post deleted.");
    await query.refetch();
  }

  const visibleFeed = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const filtered = feed.filter((post) => {
      if (typeFilter !== "ALL" && post.type !== typeFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        post.title,
        post.content,
        post.author.name,
        post.author.email,
        post.project?.name,
        ...(post.tags ?? [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    if (sortMode === "liked") {
      return [...filtered].sort((left, right) => right.likeCount - left.likeCount || Date.parse(right.createdAt) - Date.parse(left.createdAt));
    }

    return filtered;
  }, [deferredSearch, feed, sortMode, typeFilter]);

  const signalBoard = useMemo(() => {
    const typeCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    let linkedProjectPosts = 0;

    for (const post of feed) {
      typeCounts.set(post.type, (typeCounts.get(post.type) ?? 0) + 1);

      if (post.project) {
        linkedProjectPosts += 1;
      }

      for (const tag of post.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topCategory = [...typeCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
    const topTag = [...tagCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
    const hottestPost = [...feed].sort((left, right) => right.likeCount - left.likeCount)[0] ?? null;

    return {
      linkedProjectShare: feed.length > 0 ? Math.round((linkedProjectPosts / feed.length) * 100) : 0,
      topCategory,
      topTag,
      hottestPost
    };
  }, [feed]);

  if (!canAccessFeed) {
    return (
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardHeader>
          <CardTitle>Community is unavailable right now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Community access is included in every plan. If this message appears, the organization subscription or
            session needs to be refreshed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading community...</p>;
  }

  if (query.isError || !query.data) {
    return <ErrorState title="Community unavailable" description="We could not load the community feed right now." />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Community"
        description="Share market notes, project updates, and team signals in one searchable feed."
        actions={(
          <>
            <Badge variant="secondary">Internal feed</Badge>
            <Badge variant="secondary">Market + project context</Badge>
          </>
        )}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Posts</span>
              <span className="font-medium">{query.data.feed.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Ranking</span>
              <span className="font-medium">{canAccessRanking ? "Enabled" : "Locked"}</span>
            </div>
            {isPro ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Signal board</span>
                <span className="font-medium">Pro</span>
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Use this space</p>
              <p className="mt-2 font-medium">Turn team insight into searchable operating memory.</p>
            </div>
          </div>
        )}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Find signals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="community-search">Search the feed</Label>
                <Input
                  id="community-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles, tags, authors, or projects"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort by</Label>
                <Select value={sortMode} onValueChange={(value) => setSortMode(value as "recent" | "liked")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="liked">Most liked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category filter</Label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as CommunityPostType | "ALL")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    {postTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 text-sm text-muted-foreground dark:bg-white/[0.03]">
                Showing <span className="font-medium text-foreground">{visibleFeed.length}</span> of{" "}
                <span className="font-medium text-foreground">{query.data.feed.length}</span> community posts.
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-cyan-300/15 bg-gradient-to-br from-background via-background to-cyan-950/20 shadow-[0_28px_90px_rgba(8,145,178,0.12)]">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Create a studio post</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="community-title">Title</Label>
                <Input
                  id="community-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="What changed this week?"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as CommunityPostType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {postTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linked project</Label>
                  <Select value={form.projectId} onValueChange={(value) => setForm((current) => ({ ...current, projectId: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked project</SelectItem>
                      {(projectsQuery.data ?? []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-content">Post</Label>
                <Textarea
                  id="community-content"
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Share the signal, context, and next action."
                />
              </div>
              <div className="space-y-2 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-400/[0.04] p-4">
                <Label htmlFor="community-media">Photos</Label>
                <Input
                  id="community-media"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(event) => updateMediaFiles(event.target.files)}
                />
                <p className="text-xs text-muted-foreground">Add up to 4 images. Each image must be 8 MB or smaller.</p>
                {mediaFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mediaFiles.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                        {file.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-tags">Tags</Label>
                <Input
                  id="community-tags"
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="indie, pricing, cozy, capsule"
                />
              </div>
              {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
              <Button disabled={isSubmitting || !canPublishPost} onClick={createPost}>
                {isSubmitting ? "Publishing..." : "Publish update"}
              </Button>
            </CardContent>
          </Card>
          {visibleFeed.length > 0 ? visibleFeed.map((post) => (
            <Card key={post.id} className="overflow-hidden border-white/10 bg-gradient-to-br from-card via-card to-cyan-950/10 shadow-[0_20px_70px_rgba(15,23,42,0.16)]">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {post.author.image ? (
                      <img src={post.author.image} alt="" className="h-11 w-11 rounded-full border border-white/10 object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                        {(post.author.name || post.author.email).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{post.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {post.author.name || post.author.email} · {post.type.replaceAll("_", " ")} · {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {post.canDelete === true ? (
                      <Button size="sm" variant="ghost" onClick={() => deletePost(post.id)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {post.media.length > 0 ? (
                  <div className={post.media.length === 1 ? "overflow-hidden rounded-[1.5rem] border border-white/10" : "grid gap-2 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-2"}>
                    {post.media.map((item) => item.signedUrl ? (
                      <img
                        key={item.storagePath}
                        src={item.signedUrl}
                        alt={item.originalName}
                        className={post.media.length === 1 ? "max-h-[560px] w-full object-cover" : "h-64 w-full rounded-2xl object-cover"}
                      />
                    ) : null)}
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap text-muted-foreground">{post.content}</p>
                {post.project ? (
                  <div className="rounded-2xl border border-white/10 bg-white/45 p-3 text-muted-foreground dark:bg-white/[0.03]">
                    Linked project: <span className="font-medium text-foreground">{post.project.name}</span>
                  </div>
                ) : null}
                {post.tags && post.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <Button size="sm" variant={post.viewerHasLiked ? "default" : "outline"} onClick={() => toggleLike(post.id)}>
                    {post.viewerHasLiked ? "Liked" : "Like"} · {post.likeCount}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSearch(post.author.name || post.author.email)}>
                    More from author
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="overflow-hidden">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader>
                <CardTitle>No posts yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Publish the first market note, art checkpoint, or project update to start the feed.
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Community ranking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canAccessRanking ? query.data.ranking.contributors.length > 0 ? query.data.ranking.contributors.map((entry) => (
                <div key={entry.authorId} className="rounded-[1rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">#{entry.rank} {entry.authorName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.postsCount} posts · {entry.likesReceived} likes received
                      </p>
                    </div>
                    <p className="text-lg font-semibold">{entry.score}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Ranking starts as soon as members publish and react.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Upgrade your plan to unlock contributor ranking.</p>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Top posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {query.data.ranking.topPosts.length > 0 ? query.data.ranking.topPosts.map((post) => (
                <div key={post.id} className="rounded-[1rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                  <p className="font-medium">{post.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {post.likeCount} likes · {post.author.name || post.author.email}
                  </p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No standout posts yet.</p>
              )}
            </CardContent>
          </Card>
          {isPro ? (
            <Card className="overflow-hidden">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader>
                <CardTitle>Signal board</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-[1rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                  <p className="text-sm text-muted-foreground">Most active category</p>
                  <p className="mt-1 font-medium">
                    {signalBoard.topCategory ? `${signalBoard.topCategory[0].replaceAll("_", " ")} · ${signalBoard.topCategory[1]} posts` : "No signal concentration yet"}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                  <p className="text-sm text-muted-foreground">Most repeated tag</p>
                  <p className="mt-1 font-medium">
                    {signalBoard.topTag ? `${signalBoard.topTag[0]} · ${signalBoard.topTag[1]} mentions` : "No repeated tags yet"}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                  <p className="text-sm text-muted-foreground">Posts tied to projects</p>
                  <p className="mt-1 font-medium">{signalBoard.linkedProjectShare}% of feed</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                  <p className="text-sm text-muted-foreground">Hottest post right now</p>
                  <p className="mt-1 font-medium">{signalBoard.hottestPost?.title ?? "No standout post yet"}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
