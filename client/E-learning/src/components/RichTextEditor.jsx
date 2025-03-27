import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = ({ input, setInput }) => {
  const handleChange = (content, delta, source, editor) => {
    setInput((prevInput) => ({
      ...prevInput,
      description: content, // Directly set the content
    }));
  };
  

  return (
    <ReactQuill 
      theme="snow" 
      value={input.description || ""}  // Ensure it's always a string
      onChange={handleChange} 
    />
  );
};

export default RichTextEditor;
