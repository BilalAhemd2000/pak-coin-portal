import { CopyToClipboard } from "react-copy-to-clipboard";
import { useEffect, useState } from "react";
import { Tooltip as ReactTooltip } from 'react-tooltip'
import { FiCopy, FiCheck } from "react-icons/fi";

function WalletAddress({ greeting, isWithdrawView }) {
    const [copied, setCopied] = useState(false);
    const [copyIcon, setCopyIcon] = useState(false);

    useEffect(() => {
        if (copied) setTimeout(() => setCopied(false), 1200)
    }, [copied])
    return (
        <>
            <ReactTooltip
                id="walletAddrs"
                place="bottom"
                content={greeting?.walletAddress}
            />
            {!isWithdrawView && (
                <CopyToClipboard
                    text={greeting?.walletAddress}
                    onCopy={() => setCopied(true)}
                >
                    <span style={{ cursor: "pointer", marginLeft: "0.5rem", fontSize: "1rem" }}
                        data-tooltip-id="walletAddrs"
                        onMouseEnter={() => setCopyIcon(true)}
                        onMouseLeave={() => setCopyIcon(false)}
                    >
                        ({greeting?.walletAddress?.slice(0, 20)}...)
                        {copyIcon && !copied ? <FiCopy style={{ marginLeft: "0.5rem" }} /> : ""}
                        {copyIcon && copied ? <FiCheck style={{ marginLeft: "0.5rem" }} /> : ""}
                    </span>
                </CopyToClipboard>
            )}
        </>
    );
}

export default WalletAddress;
