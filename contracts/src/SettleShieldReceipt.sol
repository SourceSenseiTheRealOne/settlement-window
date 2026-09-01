// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title SettleShieldReceipt
/// @notice Tamper-evident linkage between an external settlement and bounded
///         DreamDEX Event Contract protection. This registry does not custody
///         funds and does not promise complete compensation.
contract SettleShieldReceipt {
    enum Status {
        None,
        Protected,
        Settled,
        Resolved
    }

    struct Shield {
        address owner;
        bytes32 exposureHash;
        bytes32 marketId;
        bytes32 protectionOrderTxHash;
        bytes32 settlementReferenceHash;
        bytes32 redemptionTxHash;
        uint128 exposureUsdMicros;
        uint128 maximumCostUsdMicros;
        uint128 protectedSharesMicros;
        uint128 maximumPayoutUsdMicros;
        uint128 payoutUsdMicros;
        uint64 eventContractExpiry;
        uint64 createdAt;
        uint64 settledAt;
        uint64 resolvedAt;
        uint8 winningOutcome;
        bool voided;
        Status status;
    }

    error InvalidShield();
    error ShieldAlreadyExists();
    error ShieldNotFound();
    error NotShieldOwner();
    error InvalidStatus();
    error InvalidOutcome();

    event ShieldCreated(
        bytes32 indexed shieldId,
        address indexed owner,
        bytes32 indexed marketId,
        bytes32 protectionOrderTxHash,
        uint128 maximumCostUsdMicros,
        uint128 maximumPayoutUsdMicros
    );
    event SettlementAttested(
        bytes32 indexed shieldId,
        bytes32 indexed settlementReferenceHash
    );
    event ShieldFinalized(
        bytes32 indexed shieldId,
        uint8 winningOutcome,
        bool voided,
        uint128 payoutUsdMicros,
        bytes32 redemptionTxHash
    );

    mapping(bytes32 shieldId => Shield shield) private shields;

    function createShield(
        bytes32 shieldId,
        bytes32 exposureHash,
        bytes32 marketId,
        bytes32 protectionOrderTxHash,
        uint128 exposureUsdMicros,
        uint128 maximumCostUsdMicros,
        uint128 protectedSharesMicros,
        uint128 maximumPayoutUsdMicros,
        uint64 eventContractExpiry
    ) external {
        if (shields[shieldId].status != Status.None) revert ShieldAlreadyExists();
        if (
            shieldId == bytes32(0) ||
            exposureHash == bytes32(0) ||
            marketId == bytes32(0) ||
            protectionOrderTxHash == bytes32(0) ||
            exposureUsdMicros == 0 ||
            maximumCostUsdMicros == 0 ||
            protectedSharesMicros == 0 ||
            maximumPayoutUsdMicros == 0 ||
            maximumPayoutUsdMicros > exposureUsdMicros ||
            eventContractExpiry <= block.timestamp
        ) revert InvalidShield();

        shields[shieldId] = Shield({
            owner: msg.sender,
            exposureHash: exposureHash,
            marketId: marketId,
            protectionOrderTxHash: protectionOrderTxHash,
            settlementReferenceHash: bytes32(0),
            redemptionTxHash: bytes32(0),
            exposureUsdMicros: exposureUsdMicros,
            maximumCostUsdMicros: maximumCostUsdMicros,
            protectedSharesMicros: protectedSharesMicros,
            maximumPayoutUsdMicros: maximumPayoutUsdMicros,
            payoutUsdMicros: 0,
            eventContractExpiry: eventContractExpiry,
            createdAt: uint64(block.timestamp),
            settledAt: 0,
            resolvedAt: 0,
            winningOutcome: 0,
            voided: false,
            status: Status.Protected
        });

        emit ShieldCreated(
            shieldId,
            msg.sender,
            marketId,
            protectionOrderTxHash,
            maximumCostUsdMicros,
            maximumPayoutUsdMicros
        );
    }

    function attestSettlement(
        bytes32 shieldId,
        bytes32 settlementReferenceHash
    ) external {
        Shield storage shield = _ownedShield(shieldId);
        if (shield.status != Status.Protected) revert InvalidStatus();
        if (settlementReferenceHash == bytes32(0)) revert InvalidShield();

        shield.settlementReferenceHash = settlementReferenceHash;
        shield.settledAt = uint64(block.timestamp);
        shield.status = Status.Settled;

        emit SettlementAttested(shieldId, settlementReferenceHash);
    }

    function finalizeShield(
        bytes32 shieldId,
        uint8 winningOutcome,
        bool voided,
        uint128 payoutUsdMicros,
        bytes32 redemptionTxHash
    ) external {
        Shield storage shield = _ownedShield(shieldId);
        if (shield.status != Status.Settled) revert InvalidStatus();
        if (!voided && winningOutcome > 1) revert InvalidOutcome();
        if (payoutUsdMicros > shield.maximumPayoutUsdMicros) revert InvalidShield();

        shield.winningOutcome = winningOutcome;
        shield.voided = voided;
        shield.payoutUsdMicros = payoutUsdMicros;
        shield.redemptionTxHash = redemptionTxHash;
        shield.resolvedAt = uint64(block.timestamp);
        shield.status = Status.Resolved;

        emit ShieldFinalized(
            shieldId,
            winningOutcome,
            voided,
            payoutUsdMicros,
            redemptionTxHash
        );
    }

    function getShield(bytes32 shieldId) external view returns (Shield memory) {
        Shield memory shield = shields[shieldId];
        if (shield.status == Status.None) revert ShieldNotFound();
        return shield;
    }

    function _ownedShield(bytes32 shieldId) private view returns (Shield storage shield) {
        shield = shields[shieldId];
        if (shield.status == Status.None) revert ShieldNotFound();
        if (shield.owner != msg.sender) revert NotShieldOwner();
    }
}
