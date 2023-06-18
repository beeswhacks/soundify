import './App.css';
import { default as LogInButton } from './components/LogInButton';
import { default as CreatePlaylistForm } from './components/CreatePlaylistForm';

function App() {
    return (
        <div className="App bg-black">
            <div>
                <LogInButton />
                <div className="title">Soundify</div>
                <CreatePlaylistForm />
            </div>
            <div className="footer text-white">
                Version 1.0.0
            </div>
        </div>
    );
}

export default App;
