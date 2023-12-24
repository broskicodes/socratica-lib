'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Result {
  oai_file_id: string;
  name: string;
  url: string;
  tags: string[];
  similarity: number;
}

export default function Home() {
  const [searchStr, setSearchStr] = useState('');
  const [uploadStr, setUploadStr] = useState('');
  const [results, setResults] = useState<Result[]>([]); 
  const [uploading, setUploading] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchStr(e.target.value);
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadStr(e.target.value);
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: searchStr })
    });
    
    const data = await res.json();
    setResults(data);
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(uploading) return;

    setUploading(true);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: uploadStr })
    });
    
    const data = await res.text();
    console.log(data);

    setUploadStr('');
    setUploading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 contatiner">
      <div className='flex flex-col space-y-4'>
        <div className="flex flex-row items-center justify-center">
          <form onSubmit={handleSearch} className='flex flex-row items-center space-x-2'>
            <textarea placeholder='What do you wanna read?' value={searchStr} onChange={handleSearchChange} className="text-black w-[30em]" />
            <button className='border rounded-sm py-1 px-2 hover:bg-gray-400' type='submit'>Search</button>
          </form>
        </div>
        <div className="flex flex-row items-center justify-center">
          <form onSubmit={handleUpload} className='flex flex-row items-center space-x-2'>
            <input placeholder='Upload a new file' value={uploadStr} onChange={handleUploadChange} className="text-black  w-[30em]" />
            <button className='border rounded-sm py-1 px-2 hover:bg-gray-400' type="submit" disabled={uploading}>Upload</button>
          </form>
        </div>
      </div>
      <div className="flex flex-row items-center justify-center mt-12">
        <div className="flex flex-col space-y-4">
          {results.map((result, i) => (
            <div key={i} className="flex flex-row">
              <div className="flex flex-col space-y-1">
                <Link href={result.url} target='_blank' className='hover:underline'>{result.name}</Link>
                <div className='flex flex-row space-x-1'>
                  {result.tags.map((tag, i) => (
                    <span key={i} className="flex text-center items-center text-sm text-gray-500 border border-gray-700 rounded-md p-1">{tag}</span>
                  ))}  
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
