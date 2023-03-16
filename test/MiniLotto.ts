import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";

describe("MiniLotto", function () {

  async function deployContractFixture() {
    const accounts = await ethers.getSigners();

    const Lotto = await ethers.getContractFactory("MiniLotto");
    const lotto = await Lotto.deploy();
  
    return { lotto, accounts };
  }

  describe("Deployment", function () {

    it('Should deploy MiniLotto contract', async function () {
      const { lotto } = await loadFixture(deployContractFixture);
      expect(lotto.address).to.not.be.null;
    });
  
    it('Should have an empty list of games after deployment', async function () {
      const { lotto } = await loadFixture(deployContractFixture);
      const gameCount = await lotto.games.length;
      expect(gameCount).to.equal(0);
    });
  });

  describe("Game Creation", function () {
  
    it('Should create a new game with valid parameters', async function () {
      const { lotto } = await loadFixture(deployContractFixture);

      const capacity = 5;
      const ticketPrice = 100;
      const expiration = 2000000000;
  
      await expect(lotto.createGame(capacity, ticketPrice, expiration)).to.emit(lotto, "NewGame").withArgs(0);
  
      const game = await lotto.games(0);
      expect(game.capacity).to.equal(capacity);
      expect(game.ticketPrice).to.equal(ticketPrice);
      expect(game.expiration).to.equal(expiration);
      expect(await lotto.getParticipants(0)).to.have.length(0);
    });
  
    it('Should fail to create a new game with invalid parameters', async function () {
      const { lotto } = await loadFixture(deployContractFixture);

      // Testing invalid capacity
      await expect(lotto.createGame(1, 100, 0)).to.be.revertedWith('capacity must be greater than 1');
      
      // Testing invalid ticket price
      await expect(lotto.createGame(5, 0, 0)).to.be.revertedWith("ticket price can't be zero");
      
      // Testing expired expiration
      await expect(lotto.createGame(5, 100, 1)).to.be.revertedWith('expiration must be in the future');

      // Testing null expiration
      await expect(lotto.createGame(5, 100, 0)).to.not.be.reverted;
    });
  });

  describe("Ticket Purchase", function () {
    async function createGameFixture() {
      const fixture = await loadFixture(deployContractFixture);
      const { lotto } = fixture;

      const gameId = 0;
      const capacity = 5;
      const ticketPrice = 100;
      const expiration = 2000000000;
  
      await lotto.createGame(capacity, ticketPrice, expiration);

      return { ...fixture, gameId, capacity, ticketPrice, expiration };
    }

    it("should allow a user to buy a ticket for an open game", async function() {
      const { lotto, accounts, gameId, ticketPrice } = await loadFixture(createGameFixture);

      await lotto.buyTicket(gameId, { value: ticketPrice });
      expect(await lotto.getParticipants(gameId)).to.deep.equal([accounts[0].address]);
    });
  
    it("should not allow a user to buy a ticket for a game that doesn't exist", async function() {
      const { lotto, ticketPrice } = await loadFixture(createGameFixture);
      const invalidGameId = 1;

      await expect(lotto.buyTicket(invalidGameId, { value: ticketPrice })).to.be.revertedWith("invalid ID");
    });
  
    it("should not allow a user to buy a ticket for a game that has ended", async function() {
      const { lotto, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);

      for (let i = 0; i < capacity; i++) {
        await lotto.buyTicket(gameId, { value: ticketPrice, from: accounts[0].address });
      }
  
      await expect(lotto.buyTicket(gameId, { value: ticketPrice })).to.be.revertedWith("game ended");
    });
  
    it("should not allow a user to buy a ticket for a game that has expired", async function() {
      const { lotto, gameId, ticketPrice, expiration } = await loadFixture(createGameFixture);
      
      time.increaseTo(expiration + 1);
      await expect(lotto.buyTicket(gameId, { value: ticketPrice })).to.be.revertedWith("game expired");
    });
  
    it("should not allow a user to buy a ticket with an incorrect value", async function() {
      const { lotto, gameId, ticketPrice } = await loadFixture(createGameFixture);

      await expect(lotto.buyTicket(gameId, { value: ticketPrice - 1 })).to.be.revertedWith("you must send the exact ticket price");
      await expect(lotto.buyTicket(gameId, { value: ticketPrice + 1 })).to.be.revertedWith("you must send the exact ticket price");
    });
  
    it("should allow multiple users to buy tickets for the same game", async function() {
      const { lotto, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);

      for (let i = 0; i < capacity-1; i++) {
        await lotto.connect(accounts[i]).buyTicket(gameId, { value: ticketPrice });
      }

      expect(await lotto.getParticipants(gameId)).to.deep.equal(
        accounts.map(account => account.address).slice(0, capacity-1)
      );
    });

    it("should emit a Winner event and transfer the prize to the winner when the game is full", async () => {
      const { lotto, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);
      const prize = capacity * ticketPrice;

      for (let i = 0; i < capacity-1; i++) {
        await lotto.buyTicket(gameId, { value: ticketPrice, from: accounts[0].address });
      }
      await expect(lotto.buyTicket(gameId, {value: ticketPrice, from: accounts[0].address }))
        .to.emit(lotto, "Winner")
        .withArgs(accounts[0], prize)
        .and.to.changeEtherBalance(accounts[0], prize - ticketPrice);
    });
  });
});