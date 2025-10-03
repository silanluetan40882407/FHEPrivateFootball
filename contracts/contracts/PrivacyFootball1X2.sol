// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title PrivacyFootball1X2
 * @dev Private football 1X2 betting contract with demo FHE flow.
 * - Match creator sets metadata and deadline.
 * - Users submit encrypted bet choice: 1(Home), 2(Away), X(Draw) mapped to 0,1,2.
 * - After deadline, owner/oracle sets the final result; funds are distributed.
 */
contract PrivacyFootball1X2 {
    using FHE for euint32;

    enum MatchState { Open, Closed, Settled }

    struct Bet {
        address bettor;
        uint256 amount;
        bytes32 choiceHandle; // FHE handle (dev: use low byte as plain)
        bool paid;
    }

    struct MatchInfo {
        uint256 matchId;
        string metadata; // Match description, e.g. "TeamA vs TeamB"
        uint256 deadline;
        MatchState state;
        uint32 resultPlain; // 0/1/2 final result (stored after settlement)
        euint32 resultEnc; // Demo FHE intermediate value
        uint256 totalPool;
        uint256 poolByOutcome0;
        uint256 poolByOutcome1;
        uint256 poolByOutcome2;
        address creator;
    }

    address public owner;
    uint256 public matchCounter;
    mapping(uint256 => MatchInfo) public matches;
    mapping(uint256 => Bet[]) public matchBets;

    event MatchCreated(uint256 indexed matchId, string metadata, uint256 deadline);
    event BetPlaced(uint256 indexed matchId, address indexed bettor, uint256 amount);
    event MatchClosed(uint256 indexed matchId);
    event MatchSettled(uint256 indexed matchId, uint32 result);
    event PayoutClaimed(uint256 indexed matchId, address indexed bettor, uint256 amount);

    modifier onlyOwner() { require(msg.sender == owner, "only owner"); _; }
    modifier matchExists(uint256 matchId) { require(matchId < matchCounter, "match not found"); _; }

    constructor() { owner = msg.sender; }

    // Deadline is ignored; matches can be closed by creator anytime
    function createMatch(string memory metadata, uint256 deadline) external returns (uint256) {
        uint256 matchId = matchCounter++;
        MatchInfo storage m = matches[matchId];
        m.matchId = matchId;
        m.metadata = metadata;
        m.deadline = 0; // no deadline constraint
        m.state = MatchState.Open;
        m.resultEnc = FHE.asEuint32(0);
        m.resultPlain = 3; // unset sentinel before settlement
        m.creator = msg.sender;
        emit MatchCreated(matchId, metadata, 0);
        return matchId;
    }

    // Production path: external ciphertext + attestation
    function placeBet(
        uint256 matchId,
        externalEuint32 externalChoice,
        bytes calldata attestation
    ) external payable matchExists(matchId) {
        MatchInfo storage m = matches[matchId];
        require(m.state == MatchState.Open, "not open");
        require(msg.value > 0, "no amount");

        // Convert and store handle
        euint32 enc = FHE.fromExternal(externalChoice, attestation);
        require(FHE.isSenderAllowed(enc), "not allowed");
        bytes32 handle = FHE.toBytes32(enc);

        Bet memory b = Bet({ bettor: msg.sender, amount: msg.value, choiceHandle: handle, paid: false });
        matchBets[matchId].push(b);

        m.totalPool += msg.value;
        // Dev approximation: use low byte as plaintext choice
        uint256 approx = uint256(handle) & 0xFF;
        if (approx == 0) m.poolByOutcome0 += msg.value;
        else if (approx == 1) m.poolByOutcome1 += msg.value;
        else if (approx == 2) m.poolByOutcome2 += msg.value;

        emit BetPlaced(matchId, msg.sender, msg.value);
    }

    // Dev/demo path: plaintext betting (aligned with RPS demo)
    function placeBetMock(uint256 matchId, uint8 plainChoice) external payable matchExists(matchId) {
        MatchInfo storage m = matches[matchId];
        require(m.state == MatchState.Open, "not open");
        require(msg.value > 0, "no amount");
        require(plainChoice < 3, "invalid choice");

        bytes32 handle = bytes32(uint256(plainChoice));
        Bet memory b = Bet({ bettor: msg.sender, amount: msg.value, choiceHandle: handle, paid: false });
        matchBets[matchId].push(b);

        m.totalPool += msg.value;
        if (plainChoice == 0) m.poolByOutcome0 += msg.value;
        else if (plainChoice == 1) m.poolByOutcome1 += msg.value;
        else if (plainChoice == 2) m.poolByOutcome2 += msg.value;

        emit BetPlaced(matchId, msg.sender, msg.value);
    }

    function closeMatch(uint256 matchId) external matchExists(matchId) {
        MatchInfo storage m = matches[matchId];
        require(m.state == MatchState.Open, "state");
        require(msg.sender == m.creator, "only creator");
        m.state = MatchState.Closed;
        emit MatchClosed(matchId);
    }

    // Owner sets final result (0/1/2) and writes demo enc
    function settleMatch(uint256 matchId, uint32 resultPlain) external onlyOwner matchExists(matchId) {
        MatchInfo storage m = matches[matchId];
        require(m.state == MatchState.Closed, "not closed");
        require(resultPlain < 3, "bad result");

        m.resultPlain = resultPlain;
        m.resultEnc = FHE.asEuint32(resultPlain);
        m.state = MatchState.Settled;
        emit MatchSettled(matchId, resultPlain);
    }

    function claim(uint256 matchId) external matchExists(matchId) {
        MatchInfo storage m = matches[matchId];
        require(m.state == MatchState.Settled, "not settled");

        Bet[] storage bets = matchBets[matchId];

        uint256 winnersPool = m.resultPlain == 0 ? m.poolByOutcome0 : (m.resultPlain == 1 ? m.poolByOutcome1 : m.poolByOutcome2);
        require(winnersPool > 0, "no winners");

        uint256 userShare = 0;
        for (uint256 i = 0; i < bets.length; i++) {
            Bet storage b = bets[i];
            if (b.bettor != msg.sender || b.paid) continue;
            uint256 choice = uint256(b.choiceHandle) & 0xFF;
            if (choice == m.resultPlain) {
                // Pro-rata: userBet / winnersPool * totalPool
                uint256 payout = (b.amount * m.totalPool) / winnersPool;
                b.paid = true;
                userShare += payout;
            }
        }

        require(userShare > 0, "nothing to claim");
        payable(msg.sender).transfer(userShare);
        emit PayoutClaimed(matchId, msg.sender, userShare);
    }
}


