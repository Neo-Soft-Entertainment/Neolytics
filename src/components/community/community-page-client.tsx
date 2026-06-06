"use client";

import { CommunityPostType } from "@prisma/client";
import { useState } from "react";

import { ErrorState } from "@/components/error-state";
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
  canAccessRanking
}: {
  canAccessFeed: boolean;
  canAccessRanking: boolean;
}) {
  const query = useCommunity(canAccessFeed);
  const projectsQuery = useProjects();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function createPost() {
    setFeedback(null);
    setIsSubmitting(true);

    const response = await fetch("/api/community", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: form.title,
        content: form.content,
        type: form.type,
        projectId: form.projectId === "none" ? null : form.projectId,
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
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
    setFeedback("Post published.");
    await query.refetch();
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

  if (!canAccessFeed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community is locked on your current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Upgrade to Plus or Pro to publish market notes, discuss projects with your team, and access the community
            ranking.
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share market findings, project updates, art direction thinking, and learn what the strongest teams in your
          organization are discovering.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Publish an update</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="community-title">Title</Label>
                <Input
                  id="community-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="What changed in the niche this week?"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                  placeholder="Share the market signal, the interpretation, and what the team should do next."
                />
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
              <Button disabled={isSubmitting} onClick={createPost}>
                {isSubmitting ? "Publishing..." : "Publish update"}
              </Button>
            </CardContent>
          </Card>
          {query.data.feed.length > 0 ? query.data.feed.map((post) => (
            <Card key={post.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {post.author.name || post.author.email} · {post.type.replaceAll("_", " ")} · {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button variant={post.viewerHasLiked ? "default" : "outline"} onClick={() => toggleLike(post.id)}>
                    {post.viewerHasLiked ? "Liked" : "Like"} · {post.likeCount}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">{post.content}</p>
                {post.project ? (
                  <div className="rounded-2xl border p-3 text-muted-foreground">
                    Linked project: <span className="font-medium text-foreground">{post.project.name}</span>
                  </div>
                ) : null}
                {post.tags && post.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )) : (
            <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Community ranking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canAccessRanking ? query.data.ranking.contributors.length > 0 ? query.data.ranking.contributors.map((entry) => (
                <div key={entry.authorId} className="rounded-2xl border p-4">
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
          <Card>
            <CardHeader>
              <CardTitle>Top posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {query.data.ranking.topPosts.length > 0 ? query.data.ranking.topPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border p-4">
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
        </div>
      </div>
    </div>
  );
}
