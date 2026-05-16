import React, { createContext, useState, useContext } from 'react';

const FileContext = createContext();

export function FileProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(null);
  return (
    <FileContext.Provider value={{ currentPath, setCurrentPath }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFile() {
  return useContext(FileContext);
}
