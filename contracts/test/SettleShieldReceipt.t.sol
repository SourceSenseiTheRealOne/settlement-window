// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {SettleShieldReceipt} from "../src/SettleShieldReceipt.sol";

interface Vm {
    function prank(address) external;
    function expectRevert(bytes4) external;
}

contract SettleShieldReceiptTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    SettleShieldReceipt private registry;
    address private constant OWNER = address(0xA11CE);
    address private constant STRANGER = address(0xB0B);
    bytes32 private constant SHIELD_ID = keccak256("shield-1");
    bytes32 private constant EXPOSURE_HASH = keccak256("invoice-1000-usd");
    bytes32 private constant MARKET_ID = bytes32(uint256(42));
    bytes32 private constant ORDER_TX = bytes32(uint256(77));

    function setUp() public {
        registry = new SettleShieldReceipt();
    }

    function testCreateShieldStoresBoundedProtectionReceipt() public {
        vm.prank(OWNER);
        registry.createShield(
            SHIELD_ID,
            EXPOSURE_HASH,
            MARKET_ID,
            ORDER_TX,
            1_000_000_000,
            55_000_000,
            200_000_000,
            198_000_000,
            2_000
        );

        SettleShieldReceipt.Shield memory shield = registry.getShield(SHIELD_ID);
        require(shield.owner == OWNER, "owner");
        require(shield.marketId == MARKET_ID, "market");
        require(shield.protectionOrderTxHash == ORDER_TX, "order tx");
        require(shield.maximumCostUsdMicros == 55_000_000, "cost");
        require(shield.maximumPayoutUsdMicros == 198_000_000, "payout");
        require(shield.status == SettleShieldReceipt.Status.Protected, "status");
    }

    function testDuplicateShieldIsRejected() public {
        vm.prank(OWNER);
        _create();

        vm.expectRevert(SettleShieldReceipt.ShieldAlreadyExists.selector);
        vm.prank(OWNER);
        _create();
    }

    function testOnlyOwnerCanAttestExternalSettlement() public {
        vm.prank(OWNER);
        _create();

        vm.expectRevert(SettleShieldReceipt.NotShieldOwner.selector);
        vm.prank(STRANGER);
        registry.attestSettlement(SHIELD_ID, keccak256("bridge-tx"));

        vm.prank(OWNER);
        registry.attestSettlement(SHIELD_ID, keccak256("bridge-tx"));
        require(
            registry.getShield(SHIELD_ID).status == SettleShieldReceipt.Status.Settled,
            "settled"
        );
    }

    function testOwnerFinalizesResolvedProtection() public {
        vm.prank(OWNER);
        _create();
        vm.prank(OWNER);
        registry.attestSettlement(SHIELD_ID, keccak256("invoice-paid"));

        vm.prank(OWNER);
        registry.finalizeShield(
            SHIELD_ID,
            1,
            false,
            198_000_000,
            bytes32(uint256(88))
        );

        SettleShieldReceipt.Shield memory shield = registry.getShield(SHIELD_ID);
        require(shield.winningOutcome == 1, "outcome");
        require(shield.payoutUsdMicros == 198_000_000, "payout");
        require(shield.status == SettleShieldReceipt.Status.Resolved, "resolved");
    }

    function testOwnerFinalizesVoidedProtection() public {
        vm.prank(OWNER);
        _create();
        vm.prank(OWNER);
        registry.attestSettlement(SHIELD_ID, keccak256("invoice-paid"));

        vm.prank(OWNER);
        registry.finalizeShield(
            SHIELD_ID,
            0,
            true,
            100_000_000,
            bytes32(uint256(99))
        );

        SettleShieldReceipt.Shield memory shield = registry.getShield(SHIELD_ID);
        require(shield.voided, "voided");
        require(shield.payoutUsdMicros == 100_000_000, "void payout");
        require(shield.status == SettleShieldReceipt.Status.Resolved, "resolved");
    }

    function _create() private {
        registry.createShield(
            SHIELD_ID,
            EXPOSURE_HASH,
            MARKET_ID,
            ORDER_TX,
            1_000_000_000,
            55_000_000,
            200_000_000,
            198_000_000,
            2_000
        );
    }
}
