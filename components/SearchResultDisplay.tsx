import React from 'react';

// AI가 생성한 텍스트에 간단한 서식을 적용하는 함수
const parseSearchResult = (text: string): string => {
  let inList = false;
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // Bold text: **text**
    let formattedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>');
    
    // Headers: ## Header or ### Header
    if (formattedLine.startsWith('### ')) {
      return `</ul><h4 class="text-lg font-semibold mt-4 mb-1">${formattedLine.substring(4)}</h4><ul>`;
    }
    if (formattedLine.startsWith('## ')) {
      return `</ul><h3 class="text-xl font-bold mt-5 mb-2 pb-1 border-b">${formattedLine.substring(3)}</h3><ul>`;
    }
     if (formattedLine.startsWith('# ')) {
      return `</ul><h2 class="text-2xl font-bold mt-6 mb-3 pb-2 border-b-2">${formattedLine.substring(2)}</h2><ul>`;
    }

    // Unordered list items: * item or - item
    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      const content = formattedLine.substring(trimmedLine.indexOf(' ') + 1);
      if (!inList) {
        inList = true;
        return `<ul><li class="ml-5 list-disc">${content}</li>`;
      }
      return `<li class="ml-5 list-disc">${content}</li>`;
    }

    // End of a list
    if (inList && !(trimmedLine.startsWith('* ') || trimmedLine.startsWith('- '))) {
      inList = false;
      return `</ul><p class="mt-2">${formattedLine}</p>`;
    }
    
    // Empty line for paragraph break
    if (trimmedLine === '') {
      return '<br />';
    }

    // Default paragraph
    return `<p>${formattedLine}</p>`;
  });
  
  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('');
};


const SearchResultDisplay: React.FC<{ result: string }> = ({ result }) => {
  const formattedResult = parseSearchResult(result);

  return (
    <div className="bg-white p-6 rounded-lg shadow-inner space-y-3 leading-relaxed text-gray-700 max-h-[70vh] overflow-y-auto">
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: formattedResult }} />
    </div>
  );
};

export default SearchResultDisplay;
