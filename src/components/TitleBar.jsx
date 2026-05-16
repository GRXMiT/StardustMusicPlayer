import React from 'react';

const TitleBar = () => {
    return (
        <div className="custom-title-bar">
            {/* Área que o usuário pode clicar e segurar para arrastar a janela */}
            <div className="title-bar-drag-area">
                <span className="title-bar-text">Stardust</span>
            </div>

            {/* Botões de controle da janela */}
            <div className="title-bar-controls">
                <button className="title-btn minimize" onClick={() => window.electronAPI.minimize()}>
                    &#x2012;
                </button>
                <button className="title-btn maximize" onClick={() => window.electronAPI.maximize()}>
                    &#x25A2;
                </button>
                <button className="title-btn close" onClick={() => window.electronAPI.close()}>
                    &#x2715;
                </button>
            </div>
        </div>
    );
};

export default TitleBar;