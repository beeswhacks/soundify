// App.css just makes the background black beyond the last element
import './App.css';
import { Link, Outlet } from 'react-router-dom';

import css from './App.module.css';

const App = () => {
    return (
        <div className={css.app}>
            <div className={css.navBar}>
                <Link to='/history' className={css.button}>History</Link>
            </div>
            <div className={css.content}>
                <Outlet />
            </div>
            <div className={`${css.footer} ${css.textWhite}`}>
                Version 1.0.0
            </div>
        </div>
    );
}

export default App;
