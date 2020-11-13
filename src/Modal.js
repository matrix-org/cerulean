import React from "react";

const Modal = ({ handleClose, show, children }) => {
    const showHideClassName = show
        ? "modal-overlay display-block"
        : "modal-overlay display-none";

    return (
        <div className={showHideClassName}>
            <section className="modal">
                <div>
                    <img
                        src="/close.svg"
                        alt="close"
                        className="closeButton"
                        onClick={handleClose}
                    />
                </div>
                {children}
            </section>
        </div>
    );
};

export default Modal;
