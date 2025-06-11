import React from 'react';
import { Button } from './components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './components/ThemeProvider'; // Import useTheme hook

const DarkMode = () => {
  const { theme, setTheme } = useTheme();

  // Toggle the theme between light and dark
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button onClick={toggleTheme} variant="outline" size="icon">
      {/* Display icons based on the current theme */}
      {theme === "light" ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default DarkMode;
