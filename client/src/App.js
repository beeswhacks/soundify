import './App.css';
import { useState } from 'react';

function URLGetter() {
  const [feedback, setFeedback] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      const url = new URL(formData.get('url'));
      const showId = url.href.substring(url.href.lastIndexOf('/') + 1);
      setFeedback('Generating playlist...');
      fetch('http://localhost:5000/api/' + showId, {
        method: 'POST'
      });
    } catch (error) {
      setFeedback(
        'The URL provided is incorrectly formatted. Make sure it is formatted like this: ' +
        'https://www.bbc.co.uk/sounds/play/<showId>'
      )
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label className='light-font'>
          Paste BBC sounds URL below:<br />
          <input id='url' name='url' />
        </label>
        <button type='submit'>Get playlist</button>
      </form>
      <div className='wrap-text light-font'>
        {feedback}
      </div>
    </>
  )
}

function App() {
  return (
    <div className="App">
      <div className='title'>
        Soundify
      </div>
      <URLGetter/>
    </div>
  );
}

export default App;
