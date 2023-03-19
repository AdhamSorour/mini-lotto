// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MiniLottoV2 is UUPSUpgradeable {
    struct Game {
        uint capacity;
        uint ticketPrice;
        address[] pool;
        uint expiration;
    }
    Game[] public games;

    event NewGame(uint id);
    event Winner(address, uint prize);

    function createGame(uint capacity, uint ticketPrice, uint expiration) external {
        require(capacity > 1, "capacity must be greater than 1");
        require(ticketPrice > 0, "ticket price can't be zero");
        require(expiration == 0 || expiration > block.timestamp, "expiration must be in the future");

        emit NewGame(games.length);
        games.push(Game(capacity, ticketPrice, new address[](0), expiration));
    }

    function buyTicket(uint gameId) external payable {
        require(gameId < games.length, "invalid ID");

        // game ID will always match game index in games array
        Game storage game = games[gameId];
        require(game.pool.length < game.capacity, "game ended");
        require(game.expiration > block.timestamp, "game expired");
        require(msg.value == game.ticketPrice, "you must send the exact ticket price");

        game.pool.push(msg.sender);

        if (game.pool.length == game.capacity) {
            awardRandomWinner(gameId);
        }
    }

    function refund(uint gameId) external {
        require(gameId < games.length, "invalid ID");

        Game storage game = games[gameId];
        require(game.pool.length < game.capacity, "prize has been distributed");
        require(game.expiration < block.timestamp, "game has not expired");

        for (uint i = 0; i < games[gameId].pool.length; i++) {
            (bool s, ) = games[gameId].pool[i].call{ value: games[gameId].ticketPrice }("");
            require(s, "problem with refund");
        }
    }

    uint private counter = 0;
    function awardRandomWinner(uint gameId) internal {
        Game storage game = games[gameId];

        uint prize = game.pool.length * game.ticketPrice;

        uint randomNumber = uint(keccak256(abi.encodePacked(block.timestamp, game.pool, counter++)));
        uint randomIndex = randomNumber % game.pool.length;

        emit Winner(game.pool[randomIndex], prize);

        (bool s, ) = game.pool[randomIndex].call{ value: prize }("");
        require(s, "problem with payment");
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