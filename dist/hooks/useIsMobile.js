"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsMobile = void 0;
const react_1 = require("react");
const useIsMobile = () => {
    const [isMobile, setIsMobile] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    return isMobile;
};
exports.useIsMobile = useIsMobile;
