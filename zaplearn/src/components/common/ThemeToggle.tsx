import { Check, Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettingsStore } from "@/features/settings/settingsStore";
import type { ThemePreference } from "@/features/settings/settingsRepo";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: SunMoon },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const preference = useSettingsStore((state) => state.theme);
  const saveTheme = useSettingsStore((state) => state.setTheme);
  const { setTheme } = useTheme();
  const active =
    options.find((option) => option.value === preference) ?? options[0];
  const Icon = active.icon;

  function chooseTheme(theme: ThemePreference) {
    setTheme(theme);
    void saveTheme(theme);
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Theme: ${active.label}`}
            >
              <Icon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Change theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {options.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => chooseTheme(option.value)}
            >
              <OptionIcon /> <span className="flex-1">{option.label}</span>
              {preference === option.value && <Check className="size-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
