import React, { useEffect, useState } from 'react';
import './connection-loader.scss';

const STEPS = [
    'Connecting to server…',
    'Initialising workspace…',
    'Almost ready…',
];

const ConnectionLoader = () => {
    const [step, setStep] = useState(0);

    // Cycle through status messages so it feels alive
    useEffect(() => {
        const id = setInterval(() => {
            setStep(s => (s < STEPS.length - 1 ? s + 1 : s));
        }, 2200);
        return () => clearInterval(id);
    }, []);

    return (
        <div className='conn-loader'>
            {/* Brand mark */}
            <div className='conn-loader__brand'>
                <div className='conn-loader__logo-ring'>
                    <svg className='conn-loader__logo-svg' viewBox='0 0 48 48' fill='none'>
                        {/* Snowflake / bot icon in gold */}
                        <circle cx='24' cy='24' r='10' stroke='#f7c53b' strokeWidth='2.5' />
                        <line x1='24' y1='4'  x2='24' y2='44' stroke='#f7c53b' strokeWidth='2' strokeLinecap='round' />
                        <line x1='4'  y1='24' x2='44' y2='24' stroke='#f7c53b' strokeWidth='2' strokeLinecap='round' />
                        <line x1='9.37' y1='9.37'  x2='38.63' y2='38.63' stroke='#f7c53b' strokeWidth='2' strokeLinecap='round' />
                        <line x1='38.63' y1='9.37' x2='9.37'  y2='38.63' stroke='#f7c53b' strokeWidth='2' strokeLinecap='round' />
                    </svg>
                </div>

                <div className='conn-loader__wordmark'>
                    <span className='conn-loader__word-frosty'>FROSTY</span>
                    <span className='conn-loader__word-dbot'>DBOT</span>
                </div>
            </div>

            {/* Spinner */}
            <div className='conn-loader__spinner-wrap'>
                <div className='conn-loader__ring' />
                <div className='conn-loader__ring conn-loader__ring--2' />
            </div>

            {/* Status dots */}
            <div className='conn-loader__dots'>
                {STEPS.map((_, i) => (
                    <span
                        key={i}
                        className={`conn-loader__dot${i <= step ? ' conn-loader__dot--active' : ''}`}
                    />
                ))}
            </div>

            {/* Status text */}
            <p className='conn-loader__status'>{STEPS[step]}</p>
        </div>
    );
};

export default ConnectionLoader;
