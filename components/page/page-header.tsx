"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Page } from "@prisma/client";
import { useUpdatePage } from "@/lib/hooks/use-pages";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile, Image, X, Search, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const EMOJI_GRID = [
  // Documents & office
  "📄","📝","📋","📌","📎","📚","📖","📓","📒","📕",
  "📗","📘","📙","📰","🗞️","🗂️","🗃️","🗓️","📊","📈",
  // Creativity & media
  "🎯","🎨","🎭","🎪","🎬","🎵","🎮","🎸","🎺","🎹",
  "🖼️","📷","📹","🎤","✏️","🖌️","🧩","💡","💎","💬",
  // Money & keys
  "💰","💳","🔑","🔒","🔓","💼","📦","📮","🗺️","🧭",
  // Places & travel
  "🏠","🏢","🏗️","🚀","✈️","🚁","🚗","🚂","⚡","🔥",
  "💧","🌍","🌙","⭐","🌈","🌻","🌸","🌿","🍀","🌵",
  // Food & drink
  "🍎","🍕","☕","🍇","🍓","🍊","🥑","🍅","🥗","🍰",
  // People & symbols
  "👥","❤️","✅","❌","⚠️","🔔","🏆","🎁","⏰","📅",
  // Tech & tools
  "🔧","⚙️","🛠️","🧪","🔬","💻","🖥️","📱","🌐","📐",
  // Animals & nature
  "🐶","🐱","🦊","🐼","🦋","🐝","🦉","🐢","🌲","🍃",
];

// Keywords for emoji search (comma-separated, lowercase)
const EMOJI_KEYWORDS: Record<string, string> = {
  "📄": "document,page,file", "📝": "memo,note,write", "📋": "clipboard", "📌": "pushpin,pin", "📎": "paperclip,clip,attach",
  "📚": "books", "📖": "book,read", "📓": "notebook", "📒": "ledger", "📕": "book,closed", "📗": "book,green", "📘": "book,blue", "📙": "book,orange",
  "📰": "newspaper", "🗞️": "newspaper", "🗂️": "dividers", "🗃️": "card,box", "🗓️": "calendar,spiral", "📊": "chart,bar", "📈": "chart,trend",
  "🎯": "target,dart", "🎨": "art,palette", "🎭": "theater,mask", "🎪": "circus", "🎬": "movie,clapper", "🎵": "music,note", "🎮": "game,video",
  "🎸": "guitar", "🎺": "trumpet", "🎹": "piano,keyboard", "🖼️": "frame,picture", "📷": "camera", "📹": "video", "🎤": "microphone",
  "✏️": "pencil", "🖌️": "paintbrush", "🧩": "puzzle", "💡": "lightbulb,idea", "💎": "diamond,gem", "💬": "speech,bubble",
  "💰": "money,bag", "💳": "card,credit", "🔑": "key", "🔒": "lock", "🔓": "unlock", "💼": "briefcase", "📦": "package,box",
  "📮": "mailbox", "🗺️": "map", "🧭": "compass",
  "🏠": "house,home", "🏢": "building,office", "🏗️": "construction", "🚀": "rocket", "✈️": "airplane", "🚁": "helicopter",
  "🚗": "car", "🚂": "train", "⚡": "lightning,zap", "🔥": "fire", "💧": "water,drop", "🌍": "globe,earth", "🌙": "moon",
  "⭐": "star", "🌈": "rainbow", "🌻": "sunflower", "🌸": "flower", "🌿": "herb", "🍀": "clover,luck", "🌵": "cactus",
  "🍎": "apple", "🍕": "pizza", "☕": "coffee", "🍇": "grapes", "🍓": "strawberry", "🍊": "orange", "🥑": "avocado",
  "🍅": "tomato", "🥗": "salad", "🍰": "cake",
  "👥": "people", "❤️": "heart,love", "✅": "check,done", "❌": "cross,wrong", "⚠️": "warning", "🔔": "bell",
  "🏆": "trophy", "🎁": "gift", "⏰": "clock,alarm", "📅": "calendar",
  "🔧": "wrench,tool", "⚙️": "gear,settings", "🛠️": "tools", "🧪": "test,tube", "🔬": "microscope", "💻": "laptop",
  "🖥️": "monitor,desktop", "📱": "phone", "🌐": "globe,web", "📐": "ruler",
  "🐶": "dog", "🐱": "cat", "🦊": "fox", "🐼": "panda", "🦋": "butterfly", "🐝": "bee", "🦉": "owl", "🐢": "turtle",
  "🌲": "tree", "🍃": "leaf",
};

function IconPickerContent({
  onSelect,
  onRemove,
}: {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const filteredEmojis = searchLower
    ? EMOJI_GRID.filter(
        (emoji) =>
          (EMOJI_KEYWORDS[emoji] ?? "").includes(searchLower) ||
          emoji === search.trim()
      )
    : EMOJI_GRID;

  const handleRandom = () => {
    if (filteredEmojis.length > 0) {
      const random = filteredEmojis[Math.floor(Math.random() * filteredEmojis.length)];
      onSelect(random);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium">Pick an icon</span>
        <div className="flex items-center gap-1">
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive"
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleRandom}
            title="Random icon"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto overflow-x-hidden picker-scroll">
        {filteredEmojis.length > 0 ? (
          filteredEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg shrink-0"
            >
              {emoji}
            </button>
          ))
        ) : (
          <p className="col-span-10 text-sm text-muted-foreground py-4 text-center">
            No icons match &quot;{search}&quot;
          </p>
        )}
      </div>
    </>
  );
}

interface PageHeaderProps {
  page: Page;
}

export function PageHeader({ page }: PageHeaderProps) {
  const updatePage = useUpdatePage();
  const [title, setTitle] = useState(page.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);

  const saveTitle = useCallback(
    (newTitle: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updatePage.mutate({ id: page.id, title: newTitle || "Untitled" });
      }, 500);
    },
    [page.id, updatePage]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    saveTitle(e.target.value);
  };

  const handleIconChange = (emoji: string) => {
    updatePage.mutate({ id: page.id, icon: emoji }, { onSuccess: () => toast.success("Icon updated") });
  };

  const handleRemoveIcon = () => {
    updatePage.mutate({ id: page.id, icon: null } as { id: string } & Partial<Page>, { onSuccess: () => toast.success("Icon removed") });
  };

  const handleSetCover = (url: string) => {
    updatePage.mutate({ id: page.id, coverImage: url }, { onSuccess: () => toast.success("Cover updated") });
  };

  const handleRemoveCover = () => {
    updatePage.mutate({ id: page.id, coverImage: null } as { id: string } & Partial<Page>, { onSuccess: () => toast.success("Cover removed") });
  };

  // Auto-resize title textarea on mount and content change
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  return (
    <div className="group flex w-full min-w-0 flex-col">
      {page.coverImage && (
        <div className="group/cover relative h-[20vh] min-h-[120px] md:h-[26vh] md:min-h-[170px] w-full">
          <img
            src={page.coverImage}
            alt="Cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
            <CoverPicker onSelect={handleSetCover} label="Edit cover" inOverlay />
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-background/50 backdrop-blur-md hover:bg-background/80"
              onClick={handleRemoveCover}
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full min-w-0 max-w-4xl px-4 md:pl-24 md:pr-6">
        <div className="flex items-end gap-2 mb-4">
          {page.icon && (
            <Popover>
              <PopoverTrigger asChild>
                <span 
                  className={`cursor-pointer text-[48px] md:text-[64px] leading-none transition-opacity hover:opacity-80 ${page.coverImage ? "relative z-10 -mt-8 md:-mt-11" : "mt-5 md:mt-7"}`}
                  role="button" 
                  tabIndex={0}
                >
                  {page.icon}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <IconPickerContent onSelect={handleIconChange} onRemove={handleRemoveIcon} />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {(!page.icon || !page.coverImage) && (
          <div className={`${!page.icon && !page.coverImage ? "mt-5 md:mt-7" : ""} mb-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100`}>
            {!page.icon && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground text-xs h-7"
                  >
                    <Smile className="h-3.5 w-3.5 mr-1" />
                    Add icon
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <IconPickerContent onSelect={handleIconChange} />
                </PopoverContent>
              </Popover>
            )}
            {!page.coverImage && (
              <CoverPicker onSelect={handleSetCover} />
            )}
          </div>
        )}

        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full min-w-0 resize-none overflow-hidden bg-transparent text-2xl md:text-4xl leading-tight font-bold break-words outline-none placeholder:text-muted-foreground/30"
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
        />
      </div>
    </div>
  );
}

const PICSUM_LIST_URL = "https://picsum.photos/v2/list";

type PicsumImage = { id: string; author: string; download_url: string };

function CoverPicker({
  onSelect,
  label = "Add cover",
  inOverlay = false,
}: {
  onSelect: (url: string) => void;
  label?: string;
  inOverlay?: boolean;
}) {
  const [images, setImages] = useState<PicsumImage[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${PICSUM_LIST_URL}?page=${pageNum}&limit=30`);
      const data: PicsumImage[] = await res.json();
      setImages((prev) => (pageNum === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === 30);
      if (pageNum === 1) setPage(1);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  }, [page, loadPage]);

  const onLoadInitial = useCallback(() => loadPage(1), [loadPage]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={inOverlay ? "secondary" : "ghost"}
          size="sm"
          className={
            inOverlay
              ? "h-7 text-xs bg-background/50 backdrop-blur-md hover:bg-background/80"
              : "text-muted-foreground text-xs h-7"
          }
        >
          <Image className="h-3.5 w-3.5 mr-1" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <CoverPickerContent
          images={images}
          loading={loading}
          hasMore={hasMore}
          onLoadInitial={onLoadInitial}
          onLoadMore={loadMore}
          onSelect={(id) => onSelect(`https://picsum.photos/id/${id}/1200/800`)}
        />
      </PopoverContent>
    </Popover>
  );
}

function CoverPickerContent({
  images,
  loading,
  hasMore,
  onLoadInitial,
  onLoadMore,
  onSelect,
}: {
  images: PicsumImage[];
  loading: boolean;
  hasMore: boolean;
  onLoadInitial: () => void;
  onLoadMore: () => void;
  onSelect: (id: string) => void;
}) {
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      onLoadInitial();
    }
  }, [onLoadInitial]);

  const handleRandom = () => {
    if (images.length > 0) {
      const random = images[Math.floor(Math.random() * images.length)];
      onSelect(random.id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium">Cover image</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={handleRandom}
          disabled={images.length === 0}
          title="Pick random"
        >
          <Shuffle className="h-3.5 w-3.5 mr-1" />
          Random
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Free stock photos from Picsum (Unsplash)
      </p>
      <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto picker-scroll">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => onSelect(img.id)}
            className="aspect-video rounded overflow-hidden border hover:ring-2 ring-ring transition-all shrink-0"
          >
            <img
              src={`https://picsum.photos/id/${img.id}/200/150`}
              alt={`By ${img.author}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      {loading && (
        <p className="text-xs text-muted-foreground mt-2">Loading...</p>
      )}
      {!loading && hasMore && images.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={onLoadMore}
        >
          Load more
        </Button>
      )}
    </>
  );
}
