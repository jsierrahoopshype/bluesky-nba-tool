const { useState } = React;

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoursBack, setHoursBack] = useState(24);
  const [minReposts, setMinReposts] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const API_ENDPOINT = '/api/search';

  const searchBluesky = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch(API_ENDPOINT + '?q=' + encodeURIComponent(searchQuery) + '&hours=' + hoursBack + '&minReposts=' + minReposts);
      
      if (!response.ok) {
        throw new Error('Error: ' + response.status);
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setResults(data.posts || []);
      
      if (data.posts.length === 0) {
        setError('No posts found matching your criteria. Try lowering the minimum reposts or expanding the time range.');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (post, index) => {
    const text = '"' + post.text + '"\n— ' + post.author + ' (@' + post.handle + ')\n' + post.url;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllForPresto = () => {
    const allPosts = results.map(post => 
      '"' + post.text + '"\n— ' + post.author + ' (@' + post.handle + ')\n' + post.url + '\n(' + post.reposts + ' reposts, ' + post.likes + ' likes)\n'
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(allPosts);
    setCopiedIndex('all');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6' },
    React.createElement('div', { className: 'max-w-4xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-6 mb-6' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-800 mb-2' }, 
          '🏀 Bluesky NBA Reaction Compiler'
        ),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, 
          'Search for NBA reactions and compile the most engaged posts'
        ),
        
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' },
              'Search Query'
            ),
            React.createElement('input', {
              type: 'text',
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              placeholder: 'Enter your search term...',
              className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500',
              onKeyPress: (e) => e.key === 'Enter' && searchBluesky()
            })
          ),
          
          React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Hours Back'),
              React.createElement('input', {
                type: 'number',
                value: hoursBack,
                onChange: (e) => setHoursBack(parseInt(e.target.value) || 1),
                min: '1',
                max: '168',
                className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Minimum Reposts'),
              React.createElement('input', {
                type: 'number',
                value: minReposts,
                onChange: (e) => setMinReposts(parseInt(e.target.value) || 0),
                min: '0',
                className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              })
            )
          ),
          
          React.createElement('button', {
            onClick: searchBluesky,
            disabled: loading || !searchQuery,
            className: 'w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors'
          }, loading ? 'Searching...' : 'Search Bluesky')
        )
      ),
      
      error && React.createElement('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6' },
        React.createElement('p', { className: 'text-yellow-800' }, error)
      ),
      
      results.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-6' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
          React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 
            'Found ' + results.length + ' posts'
          ),
          React.createElement('button', {
            onClick: copyAllForPresto,
            className: 'bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700'
          }, copiedIndex === 'all' ? '✓ Copied All!' : 'Copy All for Presto')
        ),
        
        React.createElement('div', { className: 'space-y-4' },
          results.map((post, index) => 
            React.createElement('div', { 
              key: index, 
              className: 'border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors' 
            },
              React.createElement('div', { className: 'flex items-start justify-between gap-4 mb-2' },
                React.createElement('div', { className: 'flex-1' },
                  React.createElement('p', { className: 'text-gray-800 mb-2 whitespace-pre-wrap' }, post.text),
                  React.createElement('div', { className: 'flex items-center gap-3 text-sm text-gray-600' },
                    React.createElement('span', { className: 'font-medium' }, post.author),
                    React.createElement('span', null, '@' + post.handle)
                  )
                ),
                React.createElement('button', {
                  onClick: () => copyToClipboard(post, index),
                  className: 'bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors'
                }, copiedIndex === index ? '✓' : '📋')
              ),
              React.createElement('div', { className: 'flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100' },
                React.createElement('span', { className: 'font-medium text-blue-600' }, post.reposts + ' reposts'),
                React.createElement('span', null, post.likes + ' likes'),
                React.createElement('span', null, post.createdAt),
                React.createElement('a', {
                  href: post.url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'text-blue-600 hover:underline ml-auto'
                }, 'View on Bluesky →')
              )
            )
          )
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));