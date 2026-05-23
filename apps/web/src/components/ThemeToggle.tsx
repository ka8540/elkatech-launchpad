import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const themeAccent = "var(--lp-accent, #d2823f)";
const menuItemClass =
  "focus:bg-[rgba(210,130,63,0.14)] focus:text-inherit data-[highlighted]:bg-[rgba(210,130,63,0.14)] data-[highlighted]:text-inherit";
const activeItemClass = "bg-[rgba(210,130,63,0.14)]";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun
            className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
            style={{ color: themeAccent }}
          />
          <Moon
            className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            style={{ color: themeAccent }}
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[140px] border-[rgba(210,130,63,0.26)] bg-[#fbfaf6] text-[#181a1d] shadow-[0_18px_42px_-20px_rgba(0,0,0,0.45)] dark:bg-[#16181d] dark:text-[#eceae3]"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(menuItemClass, theme === "light" && activeItemClass)}
        >
          <Sun className="mr-2 h-4 w-4" style={{ color: themeAccent }} />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(menuItemClass, theme === "dark" && activeItemClass)}
        >
          <Moon className="mr-2 h-4 w-4" style={{ color: themeAccent }} />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(menuItemClass, theme === "system" && activeItemClass)}
        >
          <Monitor className="mr-2 h-4 w-4" style={{ color: themeAccent }} />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
