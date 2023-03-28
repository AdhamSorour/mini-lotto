// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MiniLottoV4 is UUPSUpgradeable {
    struct Game {
        uint capacity;
        uint ticketPrice;
        address[] pool;
        uint expiry; // a value of 0 means no expiry
        bool prizeDistributed;
    }
    Game[] public games;

    event Winner(uint indexed gameId, address);

    function createGame(uint capacity, uint ticketPrice, uint expiry, uint numTickets) external payable {
        require(capacity > 1, "capacity must be greater than 1");
        require(ticketPrice > 0, "ticket price can't be zero");
		require(numTickets > 0, "creator must purchase at least 1 ticket");
        require(expiry == 0 || expiry > block.timestamp, "expiry must be in the future");

        games.push(Game(capacity, ticketPrice, new address[](0), expiry, false));
		buyTickets(games.length-1, numTickets);
    }

    function buyTickets(uint gameId, uint numTickets) public payable {
        require(gameId < games.length, "invalid ID");

        // game ID will always match game index in games array
        Game storage game = games[gameId];
        require(game.pool.length < game.capacity, "game ended");
        require(game.expiry == 0 || game.expiry > block.timestamp, "game expired");
		require(numTickets <= game.capacity - game.pool.length, "numTickets exceed available tickets");
        require(msg.value == game.ticketPrice * numTickets, "you must send the exact ticket price");

		for (uint i = 0; i < numTickets; i++) {
        	game.pool.push(msg.sender);
		}

        if (game.pool.length == game.capacity) {
            awardRandomWinner(gameId);
        }
    }

    function distributePrize(uint gameId) external {
        require(gameId < games.length, "invalid ID");

        Game storage game = games[gameId];
        require(game.expiry > 0 && game.expiry < block.timestamp, "game has not expired");
        require(!game.prizeDistributed && game.pool.length < game.capacity, "prize has been distributed");

        game.prizeDistributed = true;

        awardRandomWinner(gameId);
    }

    uint private counter = 0;
    function awardRandomWinner(uint gameId) internal {
        Game storage game = games[gameId];

        uint prize = game.pool.length * game.ticketPrice;

        uint randomNumber = uint(keccak256(abi.encodePacked(block.timestamp, game.pool, counter++)));
        uint randomIndex = randomNumber % game.pool.length;

        emit Winner(gameId, game.pool[randomIndex]);

        (bool s, ) = game.pool[randomIndex].call{ value: prize }("");
        require(s, "problem with payment");
    }

    function getGames() external view returns (Game[] memory) {
        return games;
    }

    function getParticipants(uint gameId) external view returns (address[] memory) {
        return games[gameId].pool;
    }

    // required override from UUPSUpgradeable
    // handles the proxy upgrade authorization
    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == _getAdmin(), "not authorized, admin only");
    }
}