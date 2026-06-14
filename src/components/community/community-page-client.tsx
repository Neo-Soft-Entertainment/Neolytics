"use client";

import { CommunityPostPriority, CommunityPostScope, CommunityPostType, SubscriptionPlan } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";

import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type CommunityPostItem, type CommunityResponse, useCommunity } from "@/features/community/hooks";
import { useProjects } from "@/features/projects/hooks";

const postTypeOptions: Array<{ value: CommunityPostType; label: string }> = [
  { value: CommunityPostType.GENERAL, label: "Geral" },
  { value: CommunityPostType.MARKET, label: "Mercado" },
  { value: CommunityPostType.IDEA, label: "Ideia" },
  { value: CommunityPostType.ART, label: "Arte" },
  { value: CommunityPostType.SHOWCASE, label: "Vitrine" },
  { value: CommunityPostType.HELP, label: "Ajuda" }
];

const scopeOptions: Array<{ value: CommunityPostScope; label: string }> = [
  { value: CommunityPostScope.ORGANIZATION, label: "Interno" },
  { value: CommunityPostScope.GLOBAL, label: "Global" }
];

const priorityOptions: Array<{ value: CommunityPostPriority; label: string }> = [
  { value: CommunityPostPriority.LOW, label: "Baixa" },
  { value: CommunityPostPriority.NORMAL, label: "Normal" },
  { value: CommunityPostPriority.HIGH, label: "Alta" },
  { value: CommunityPostPriority.URGENT, label: "Urgente" }
];

const scopeDescriptions = {
  [CommunityPostScope.ORGANIZATION]: "Posts internos da organização, com comentários e vínculos de projeto.",
  [CommunityPostScope.GLOBAL]: "Feed global entre estúdios no Neolytics, sem vínculos internos."
};

function getCommunityQueryKey(scope: CommunityPostScope) {
  return ["community", scope] as const;
}

function parsePostTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPostTitle(content: string) {
  const firstLine = content.split("\n")[0]?.slice(0, 80) ?? "";

  if (firstLine.trim()) {
    return firstLine;
  }

  return "Community post";
}

function getOptimisticAuthor() {
  return {
    id: "optimistic-user",
    name: "Você",
    email: "Você",
    image: null
  };
}

function revokeOptimisticMediaUrls(media: CommunityPostItem["media"]) {
  for (const item of media) {
    if (!item.signedUrl?.startsWith("blob:")) {
      continue;
    }

    URL.revokeObjectURL(item.signedUrl);
  }
}

function getPriorityBadgeClass(priority: CommunityPostPriority) {
  if (priority === CommunityPostPriority.URGENT) {
    return "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (priority === CommunityPostPriority.HIGH) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (priority === CommunityPostPriority.LOW) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  return "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function getPriorityCardClass(priority: CommunityPostPriority) {
  if (priority === CommunityPostPriority.URGENT) {
    return "border-l-red-500";
  }

  if (priority === CommunityPostPriority.HIGH) {
    return "border-l-amber-500";
  }

  if (priority === CommunityPostPriority.LOW) {
    return "border-l-emerald-500";
  }

  return "border-l-sky-500";
}

export function CommunityPageClient({
  canAccessFeed,
  canAccessRanking,
  subscriptionPlan
}: {
  canAccessFeed: boolean;
  canAccessRanking: boolean;
  subscriptionPlan: SubscriptionPlan;
}) {
  const queryClient = useQueryClient();
  const [scopeFilter, setScopeFilter] = useState<CommunityPostScope>(CommunityPostScope.ORGANIZATION);
  const query = useCommunity(canAccessFeed, scopeFilter);
  const projectsQuery = useProjects();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CommunityPostType | "ALL">("ALL");
  const [sortMode, setSortMode] = useState<"recent" | "liked">("recent");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [form, setForm] = useState<{
    content: string;
    scope: CommunityPostScope;
    priority: CommunityPostPriority;
    type: CommunityPostType;
    projectId: string;
    tags: string;
  }>({
    content: "",
    scope: CommunityPostScope.ORGANIZATION,
    priority: CommunityPostPriority.NORMAL,
    type: CommunityPostType.GENERAL,
    projectId: "none",
    tags: ""
  });
  const feed = query.data?.feed ?? [];
  const deferredSearch = useDeferredValue(search);
  const canPublishPost = form.content.trim().length > 0;
  const planLabel = subscriptionPlan === SubscriptionPlan.PRO ? "Comunidade Pro" : "Comunidade";

  function updateCommunityCache(scope: CommunityPostScope, update: (current: CommunityResponse) => CommunityResponse) {
    queryClient.setQueryData<CommunityResponse>(getCommunityQueryKey(scope), (current) => {
      if (!current) {
        return current;
      }

      return update(current);
    });
  }

  function restoreCommunityCache(scope: CommunityPostScope, previousData: CommunityResponse | undefined) {
    if (!previousData) {
      return;
    }

    queryClient.setQueryData(getCommunityQueryKey(scope), previousData);
  }

  function refreshCommunityCache(scope: CommunityPostScope) {
    void queryClient.invalidateQueries({
      queryKey: getCommunityQueryKey(scope),
      exact: true
    });
  }

  function buildOptimisticPost(postId: string, submittedForm: typeof form, submittedMedia: File[]) {
    let project: CommunityPostItem["project"] = null;

    if (submittedForm.scope === CommunityPostScope.ORGANIZATION && submittedForm.projectId !== "none") {
      const selectedProject = projectsQuery.data?.find((item) => item.id === submittedForm.projectId);

      if (selectedProject) {
        project = {
          id: selectedProject.id,
          name: selectedProject.name,
          stage: selectedProject.stage
        };
      }
    }

    return {
      id: postId,
      title: getPostTitle(submittedForm.content),
      content: submittedForm.content.trim(),
      scope: submittedForm.scope,
      priority: submittedForm.priority,
      type: submittedForm.type,
      tags: parsePostTags(submittedForm.tags),
      likeCount: 0,
      viewerHasLiked: false,
      canDelete: true,
      createdAt: new Date().toISOString(),
      media: submittedMedia.map((file, index) => ({
        storagePath: `${postId}-${index}`,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        signedUrl: URL.createObjectURL(file)
      })),
      comments: [],
      author: getOptimisticAuthor(),
      project
    };
  }

  async function createPost() {
    setFeedback(null);

    if (!canPublishPost) {
      setFeedback("Escreva algo antes de publicar.");
      return;
    }

    const submittedForm = form;
    const submittedMedia = mediaFiles;
    const submittedScope = submittedForm.scope;
    const queryKey = getCommunityQueryKey(submittedScope);
    const previousData = queryClient.getQueryData<CommunityResponse>(queryKey);
    const optimisticPost = buildOptimisticPost(`optimistic-post-${Date.now()}`, submittedForm, submittedMedia);

    updateCommunityCache(submittedScope, (current) => ({
      ...current,
      feed: [optimisticPost, ...current.feed]
    }));
    setForm({
      content: "",
      scope: scopeFilter,
      priority: CommunityPostPriority.NORMAL,
      type: CommunityPostType.GENERAL,
      projectId: "none",
      tags: ""
    });
    setMediaFiles([]);
    setFeedback("Publicando em background...");
    setIsSubmitting(true);

    const payload = new FormData();
    payload.append("content", submittedForm.content.trim());
    payload.append("scope", submittedForm.scope);
    payload.append("priority", submittedForm.priority);
    payload.append("type", submittedForm.type);

    let projectId = submittedForm.projectId;
    if (submittedForm.scope === CommunityPostScope.GLOBAL) {
      projectId = "none";
    }

    payload.append("projectId", projectId);
    payload.append("tags", submittedForm.tags);

    for (const file of submittedMedia) {
      payload.append("media", file);
    }

    const response = await fetch("/api/community", {
      method: "POST",
      body: payload
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      restoreCommunityCache(submittedScope, previousData);
      revokeOptimisticMediaUrls(optimisticPost.media);
      setForm(submittedForm);
      setMediaFiles(submittedMedia);
      setFeedback(payload?.message ?? "Não foi possível publicar o post.");
      return;
    }

    const createdPost = (await response.json()) as CommunityPostItem;
    const confirmedPost = {
      ...createdPost,
      canDelete: true
    };

    updateCommunityCache(submittedScope, (current) => ({
      ...current,
      feed: current.feed.map((post) => {
        if (post.id === optimisticPost.id) {
          return confirmedPost;
        }

        return post;
      })
    }));
    revokeOptimisticMediaUrls(optimisticPost.media);
    setFeedback("Post publicado.");
    refreshCommunityCache(submittedScope);
  }

  async function createComment(postId: string) {
    const content = commentDrafts[postId]?.trim() ?? "";

    if (!content) {
      setFeedback("Escreva um comentário antes de enviar.");
      return;
    }

    setFeedback(null);
    setSubmittingCommentId(postId);
    const previousData = queryClient.getQueryData<CommunityResponse>(getCommunityQueryKey(scopeFilter));
    const optimisticComment = {
      id: `optimistic-comment-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      author: getOptimisticAuthor()
    };

    updateCommunityCache(scopeFilter, (current) => ({
      ...current,
      feed: current.feed.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          comments: [...post.comments, optimisticComment]
        };
      })
    }));
    setCommentDrafts((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });

    const response = await fetch(`/api/community/${postId}/comments`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ content })
    });
    setSubmittingCommentId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      restoreCommunityCache(scopeFilter, previousData);
      setCommentDrafts((current) => ({
        ...current,
        [postId]: content
      }));
      setFeedback(payload?.message ?? "Não foi possível publicar o comentário.");
      return;
    }

    const createdComment = await response.json() as CommunityPostItem["comments"][number];

    updateCommunityCache(scopeFilter, (current) => ({
      ...current,
      feed: current.feed.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          comments: post.comments.map((comment) => {
            if (comment.id === optimisticComment.id) {
              return createdComment;
            }

            return comment;
          })
        };
      })
    }));
    refreshCommunityCache(scopeFilter);
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
      setFeedback("Use apenas imagens de até 8 MB.");
      return;
    }

    setMediaFiles(selected);
  }

  async function toggleLike(postId: string) {
    const previousData = queryClient.getQueryData<CommunityResponse>(getCommunityQueryKey(scopeFilter));

    updateCommunityCache(scopeFilter, (current) => ({
      ...current,
      feed: current.feed.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        let likeCount = post.likeCount + 1;
        if (post.viewerHasLiked) {
          likeCount = Math.max(0, post.likeCount - 1);
        }

        return {
          ...post,
          viewerHasLiked: !post.viewerHasLiked,
          likeCount
        };
      })
    }));

    const response = await fetch(`/api/community/${postId}/like`, {
      method: "POST"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      restoreCommunityCache(scopeFilter, previousData);
      setFeedback(payload?.message ?? "Não foi possível atualizar a reação.");
      return;
    }

    refreshCommunityCache(scopeFilter);
  }

  async function deletePost(postId: string) {
    const previousData = queryClient.getQueryData<CommunityResponse>(getCommunityQueryKey(scopeFilter));

    updateCommunityCache(scopeFilter, (current) => ({
      ...current,
      feed: current.feed.filter((post) => post.id !== postId)
    }));

    const response = await fetch(`/api/community/${postId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      restoreCommunityCache(scopeFilter, previousData);
      setFeedback(payload?.message ?? "Não foi possível excluir o post.");
      return;
    }

    setFeedback("Post excluído.");
    refreshCommunityCache(scopeFilter);
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
        post.scope,
        post.priority,
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

  if (!canAccessFeed) {
    return (
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardHeader>
          <CardTitle>A comunidade está indisponível agora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            O acesso à comunidade está incluído em todos os planos. Se esta mensagem aparecer, a assinatura da organização
            ou a sessão precisa ser atualizada.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando comunidade...</p>;
  }

  if (query.isError || !query.data) {
    return <ErrorState title="Comunidade indisponível" description="Não foi possível carregar o feed da comunidade agora." />;
  }

  return (
    <div className="space-y-5 lg:flex lg:h-[calc(100vh-7rem)] lg:flex-col lg:overflow-hidden">
      <div className="flex flex-col gap-3 lg:flex-none lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Comunidade</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartilhe atualizações do estúdio com sua organização ou com a comunidade ampla da Neolytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Interno</Badge>
          <Badge variant="secondary">Global</Badge>
          <Badge variant="secondary">{planLabel}</Badge>
        </div>
      </div>
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_160px] lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_180px] 2xl:grid-cols-[340px_minmax(0,1fr)_200px]">
        <Tabs
          className="order-3 rounded-lg border bg-card p-3 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:max-h-full lg:self-start lg:overflow-y-auto"
          value={scopeFilter}
          onValueChange={(value) => {
            const scope = value as CommunityPostScope;
            setScopeFilter(scope);
            setForm((current) => ({
              ...current,
              scope,
              projectId: scope === CommunityPostScope.GLOBAL ? "none" : current.projectId
            }));
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-lg border bg-card p-1.5">
            {scopeOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="mt-2 text-sm text-muted-foreground">{scopeDescriptions[scopeFilter]}</p>
          <div className="mt-3 space-y-2 border-t pt-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Posts</span>
              <span className="font-medium">{query.data.feed.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Comentários</span>
              <span className="font-medium">{query.data.feed.reduce((total, post) => total + post.comments.length, 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Ranking</span>
              <span className="font-medium">{canAccessRanking ? "Ativo" : "Bloqueado"}</span>
            </div>
          </div>
        </Tabs>

        <div className="contents">
          <Card className="order-2 overflow-hidden lg:col-start-2 lg:row-start-1 lg:self-start">
            <CardHeader>
              <CardTitle>Encontrar sinais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] xl:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="space-y-2 md:col-span-2 xl:col-span-1">
                <Label htmlFor="community-search">Pesquisar no feed</Label>
                <Input
                  id="community-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar legendas, tags, autores ou projetos"
                />
              </div>
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select value={sortMode} onValueChange={(value) => setSortMode(value as "recent" | "liked")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="liked">Mais curtidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filtro de categoria</Label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as CommunityPostType | "ALL")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as categorias</SelectItem>
                    {postTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border bg-muted/35 p-4 text-sm text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{visibleFeed.length}</span> de{" "}
                <span className="font-medium text-foreground">{query.data.feed.length}</span> posts da comunidade.
              </div>
            </CardContent>
          </Card>
          <Card className="order-1 max-h-[calc(100vh-6rem)] overflow-y-auto lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-h-full lg:self-start">
            <CardHeader>
              <CardTitle>Criar post</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>Público</Label>
                  <Select
                    value={form.scope}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      scope: value as CommunityPostScope,
                      projectId: value === CommunityPostScope.GLOBAL ? "none" : current.projectId
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
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
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value as CommunityPostPriority }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.scope === CommunityPostScope.ORGANIZATION ? (
                <div className="space-y-2">
                  <Label>Projeto vinculado</Label>
                  <Select value={form.projectId} onValueChange={(value) => setForm((current) => ({ ...current, projectId: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum projeto vinculado</SelectItem>
                      {(projectsQuery.data ?? []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="community-content">Legenda</Label>
                <Textarea
                  id="community-content"
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Escreva uma legenda..."
                />
              </div>
              <div className="space-y-2 rounded-lg border border-dashed bg-muted/25 p-4">
                <Label htmlFor="community-media">Fotos</Label>
                <Input
                  id="community-media"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(event) => updateMediaFiles(event.target.files)}
                />
                <p className="text-xs text-muted-foreground">Adicione até 4 imagens. Cada imagem deve ter 8 MB ou menos.</p>
                {mediaFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mediaFiles.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
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
                {isSubmitting ? "Publicando..." : "Publicar atualização"}
              </Button>
            </CardContent>
          </Card>
          <div className="order-4 min-h-0 space-y-4 lg:col-start-2 lg:row-start-2 lg:h-full lg:overflow-y-auto lg:pr-1">
          {visibleFeed.length > 0 ? visibleFeed.map((post) => (
            <Card key={post.id} className={`overflow-hidden border-l-4 ${getPriorityCardClass(post.priority)}`}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {post.author.image ? (
                      <img src={post.author.image} alt="" className="h-11 w-11 rounded-full border object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                        {(post.author.name || post.author.email).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium leading-none">{post.author.name || post.author.email}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {postTypeOptions.find((option) => option.value === post.type)?.label ?? post.type.replaceAll("_", " ")} · {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {post.scope === CommunityPostScope.GLOBAL ? "Global" : "Interno"}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${getPriorityBadgeClass(post.priority)}`}>
                      {priorityOptions.find((option) => option.value === post.priority)?.label ?? post.priority}
                    </span>
                    {post.canDelete === true ? (
                      <Button size="sm" variant="ghost" onClick={() => deletePost(post.id)}>
                        Excluir
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {post.media.length > 0 ? (
                  <div className={post.media.length === 1 ? "overflow-hidden rounded-lg border" : "grid gap-2 overflow-hidden rounded-lg border bg-muted/20 p-2 sm:grid-cols-2"}>
                    {post.media.map((item) => item.signedUrl ? (
                      <img
                        key={item.storagePath}
                        src={item.signedUrl}
                        alt={item.originalName}
                        className={post.media.length === 1 ? "max-h-[560px] w-full object-cover" : "h-64 w-full rounded-md object-cover"}
                      />
                    ) : null)}
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap text-muted-foreground">
                  <span className="font-semibold text-foreground">{post.author.name || post.author.email}</span>{" "}
                  {post.content}
                </p>
                {post.project ? (
                  <div className="rounded-lg border bg-muted/35 p-3 text-muted-foreground">
                    Projeto vinculado: <span className="font-medium text-foreground">{post.project.name}</span>
                  </div>
                ) : null}
                {post.tags && post.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <Button size="sm" variant={post.viewerHasLiked ? "default" : "outline"} onClick={() => toggleLike(post.id)}>
                    {post.viewerHasLiked ? "Curtido" : "Curtir"} · {post.likeCount}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSearch(post.author.name || post.author.email)}>
                    Mais do autor
                  </Button>
                </div>
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium">Comentários</p>
                  {post.comments.length > 0 ? (
                    <div className="space-y-2">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg border bg-muted/25 p-3">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{comment.author.name || comment.author.email}</span>{" "}
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ainda não há comentários.</p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={commentDrafts[post.id] ?? ""}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      placeholder="Adicionar comentário"
                    />
                    <Button disabled={submittingCommentId === post.id} onClick={() => createComment(post.id)}>
                      {submittingCommentId === post.id ? "Enviando..." : "Comentar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Ainda não há posts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Publique a primeira nota de mercado, checkpoint de arte ou atualização de projeto para iniciar o feed.
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
