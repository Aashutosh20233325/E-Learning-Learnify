import React from 'react';
import { Button } from './components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './components/ThemeProvider'; 

const DarkMode = () => {
  const { theme, setTheme } = useTheme();


  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button onClick={toggleTheme} variant="outline" size="icon">

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
