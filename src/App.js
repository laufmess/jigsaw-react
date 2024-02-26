import './App.css';
import './components/setupMeta';
import './components/setupGame';
import './components/jigsaw';
import './components/plugins/cors';
import './components/plugins/transform';

function App() {
    return (
        <div touch-action="none" unresolved>
            <div className="ui disabled">
                <div className="ui-popup-container disabled">
                    <div className="ui-popup">
                        <div className="section">
                            <h1>Congratulation!</h1>
                        </div>
                        <div className="section container">
                            <h2>Generate new puzzle</h2>
                            <label htmlFor="url"><input id="url" placeholder="Image link" type="text"/></label>
                            <label htmlFor="cols"><input id="cols" min="0" placeholder="Width" type="number"/></label> x
                            <label htmlFor="rows"><input id="rows" min="0" placeholder="Height" type="number"/></label>
                            <br></br>
                            <div>
                                <button onClick="window.location.href = generate()" type="button">Generate</button>
                            </div>
                        </div>
                        <div className="section">
                            <a id="again">
                                <button type="button">Play again</button>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="ui-container">
                    <div className="tooltip">
                        <span className="tooltip-content">Preview</span>
                        <div className="functionality" onClick="hint()">
                            <span className="material-icons">visibility</span>
                        </div>
                    </div>
                    <div className="tooltip">
                        <span className="tooltip-content">Verify</span>
                        <div className="functionality" onClick="verify()">
                            <span className="material-icons">task_alt</span>
                        </div>
                    </div>
                    <div className="tooltip">
                        <span className="tooltip-content">Fullscreen</span>
                        <div className="functionality" onClick="toggleFullscreen(this)">
                            <span className="material-icons">fullscreen</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
