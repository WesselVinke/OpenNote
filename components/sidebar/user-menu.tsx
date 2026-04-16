"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Moon, Sun, Monitor, Settings } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";

export function UserMenu() {
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="h-6 w-6 cursor-pointer">
              <AvatarFallback className="text-[10px]">Y</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
            <Sun className="h-4 w-4" />
            Light
            {theme === "light" && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
            <Moon className="h-4 w-4" />
            Dark
            {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
            <Monitor className="h-4 w-4" />
            System
            {theme === "system" && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
