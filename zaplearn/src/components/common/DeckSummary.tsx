import {
  BookOpen,
  Languages,
  MoreHorizontal,
  Pencil,
  Play,
} from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  getDeckStats,
  relativeStudyDate,
} from "@/features/progress/progressStats";
import type { Deck } from "@/types/deck";
import type { ProgressDocument } from "@/types/progress";

export function DeckSummary({
  deck,
  progress,
}: {
  deck: Deck;
  progress?: ProgressDocument;
}) {
  const stats = getDeckStats(deck, progress);
  const learnedPercent = stats.total
    ? ((stats.learning + stats.mastered) / stats.total) * 100
    : 0;
  return (
    <Card className="group h-full gap-5 overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-4" />
          </span>
          {stats.due > 0 ? (
            <Badge>{stats.due} due</Badge>
          ) : (
            <Badge variant="secondary">Caught up</Badge>
          )}
        </div>
        <CardTitle className="line-clamp-2 text-lg leading-snug">
          <h3>{deck.title}</h3>
        </CardTitle>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Languages className="size-3.5" />{" "}
          {deck.lang?.toUpperCase() ?? "Any language"} · {deck.cards.length}{" "}
          {deck.cards.length === 1 ? "card" : "cards"}
        </p>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`More actions for ${deck.title}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/edit/${deck.id}`}>
                  <Pencil /> Edit deck
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/train/${deck.id}?mode=browse`}>
                  <BookOpen /> Browse cards
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/manage">Manage deck</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{stats.mastered} mastered</span>
          <span>{Math.round(learnedPercent)}%</span>
        </div>
        <Progress value={learnedPercent} />
        <p className="pt-1 text-xs text-muted-foreground">
          {relativeStudyDate(stats.lastStudied)}
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        {deck.cards.length ? (
          <Button asChild className="flex-1">
            <Link to={`/train/${deck.id}`}>
              <Play /> Study
            </Link>
          </Button>
        ) : (
          <Button asChild className="flex-1">
            <Link to={`/edit/${deck.id}`}>
              <Pencil /> Add cards
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" aria-label={`Edit ${deck.title}`}>
          <Link to={`/edit/${deck.id}`}>
            <Pencil />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
