import React from 'react';
import { observer } from 'mobx-react-lite';
import DraggableResizeWrapper from '@/components/draggable/draggable-resize-wrapper';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';

const DCirclesModal = observer(() => {
    const { dashboard } = useStore();
    const { is_d_circles_modal_visible, setDCirclesModalVisibility } = dashboard;

    return (
        <React.Fragment>
            {is_d_circles_modal_visible && (
                <DraggableResizeWrapper
                    boundary='.main'
                    header={localize('D-Circles')}
                    onClose={setDCirclesModalVisibility}
                    modalWidth={420}
                    modalHeight={560}
                    minWidth={320}
                    minHeight={400}
                    enableResizing
                >
                    <div style={{ height: 'calc(100% - 6rem)', padding: '0.5rem' }}>
                        <iframe
                            src='https://frostydcircles.vercel.app/'
                            title='D-Circles'
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0.4rem' }}
                        />
                    </div>
                </DraggableResizeWrapper>
            )}
        </React.Fragment>
    );
});

export default DCirclesModal;
