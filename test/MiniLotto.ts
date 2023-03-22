import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MiniLotto", function () {

  async function deployImplementationsFixture() {
    const accounts = await ethers.getSigners();

    // This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1
    const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

    const LottoV1 = await ethers.getContractFactory("MiniLottoV1");
    const lottoV1 = await LottoV1.deploy();

    const LottoV3 = await ethers.getContractFactory("MiniLottoV3");
    const lottoV3 = await LottoV3.deploy();

    return { lottoV1, lottoV3, accounts, IMPL_SLOT };
  }

  async function deployProxyAsV1Fixture() {
    const fixture = await loadFixture(deployImplementationsFixture);
    const { lottoV1 } = fixture;

    const Proxy = await ethers.getContractFactory("MiniLottoProxy");
    const proxy = await Proxy.deploy(lottoV1.address, []);

    // impose the logic interface over the proxy address
    // (trick to get ethers to run the logic functions easily)
    const proxyAsV1 = await ethers.getContractAt("MiniLottoV1", proxy.address);

    return { ...fixture, proxy, proxyAsV1 };
  }

  async function deployProxyAsV3Fixture() {
    const fixture = await loadFixture(deployImplementationsFixture);
    const { lottoV3 } = fixture;

    const Proxy = await ethers.getContractFactory("MiniLottoProxy");
    const proxy = await Proxy.deploy(lottoV3.address, []);

    // impose the logic interface over the proxy address
    // (trick to get ethers to run the logic functions easily)
    const proxyAsV3 = await ethers.getContractAt("MiniLottoV3", proxy.address);

    return { ...fixture, proxy, proxyAsV3 };
  }



  describe("Deployment", function () {

    it('Should fail to deploy proxy with an EOA address', async function () {
      const { accounts } = await loadFixture(deployProxyAsV1Fixture);

      const Proxy = await ethers.getContractFactory("MiniLottoProxy");
      await expect(Proxy.deploy(accounts[1].address, [])).to.be.reverted;
    });

    it('Should fail to deploy proxy with a non-UUPS-compatible implementation', async function () {
      const INCOMPATIBLE_ADDRESS = "0xd1d1D4e36117aB794ec5d4c78cBD3a8904E691D0";

      const Proxy = await ethers.getContractFactory("MiniLottoProxy");
      await expect(Proxy.deploy(INCOMPATIBLE_ADDRESS, [])).to.be.reverted;
    });

    it('Should deploy contracts', async function () {
      const { proxy, lottoV1, lottoV3 } = await loadFixture(deployProxyAsV1Fixture);
      
      expect(proxy.address).to.not.be.null;
      expect(lottoV1.address).to.not.be.null;
      expect(lottoV3.address).to.not.be.null;
    });
  
    it('Should have MiniLottoV1 implementation', async function () {
      const { proxy, lottoV1, IMPL_SLOT } = await loadFixture(deployProxyAsV1Fixture);
      
      expect(await ethers.provider.getStorageAt(proxy.address, IMPL_SLOT))
        .to.deep.equal(ethers.utils.hexZeroPad(lottoV1.address, 32));
    });
  });

  describe("Upgrades", function () {
    it("Should not allow non admin to upgrade",async () => {
      const { proxyAsV1, lottoV3, accounts } = await loadFixture(deployProxyAsV1Fixture);
     
      await expect(proxyAsV1.connect(accounts[1]).upgradeTo(lottoV3.address))
        .to.be.revertedWith("unauthorized, admin only");
    });

    it("Should allow admin to upgrade",async () => {
      const { proxyAsV1, lottoV3, IMPL_SLOT } = await loadFixture(deployProxyAsV1Fixture);
      
      await expect(proxyAsV1.upgradeTo(lottoV3.address)).to.not.be.reverted;
      expect(await ethers.provider.getStorageAt(proxyAsV1.address, IMPL_SLOT))
        .to.deep.equal(ethers.utils.hexZeroPad(lottoV3.address, 32));
    });

    it("Should not upgrade if new address is not a contact", async () => {
      const { proxyAsV1, accounts } = await loadFixture(deployProxyAsV1Fixture);
      
      await expect(proxyAsV1.upgradeTo(accounts[1].address))
        .to.be.reverted;//With("ERC1967: new implementation is not a contract");
    })

    it("Should not upgrade to an non-UUPS-compatible implementation", async () => {
      const { proxyAsV1 } = await loadFixture(deployProxyAsV1Fixture);
      const INCOMPATIBLE_ADDRESS = "0xd1d1D4e36117aB794ec5d4c78cBD3a8904E691D0";
      
      await expect(proxyAsV1.upgradeTo(INCOMPATIBLE_ADDRESS))
        .to.be.reverted;//With("ERC1967Upgrade: new implementation is not UUPS");
    })
  });

  describe("Game Creation", function () {
  
    it('Should create a new game with valid parameters', async function () {
      const { proxyAsV3, accounts } = await loadFixture(deployProxyAsV3Fixture);

      const capacity = 5;
      const ticketPrice = 100;
      const expiration = 2000000000;
      const numTickets = 3;
      const participants = [];
      for (let i = 0; i < numTickets; i++) {
        participants.push(accounts[0].address);
      }
  
      await proxyAsV3.createGame(
        capacity, ticketPrice, expiration, numTickets, 
        { value: numTickets*ticketPrice}
      );
  
      const game = await proxyAsV3.games(0);
      expect(game.capacity).to.equal(capacity);
      expect(game.ticketPrice).to.equal(ticketPrice);
      expect(game.expiration).to.equal(expiration);
      expect(game.refunded).to.equal(false);
      expect(await proxyAsV3.getParticipants(0))
        .to.have.length(numTickets)
        .and.to.deep.equal(participants);
    });
  
    it('Should fail to create a new game with invalid parameters', async function () {
      const { proxyAsV3 } = await loadFixture(deployProxyAsV3Fixture);

      // Testing invalid capacity
      await expect(proxyAsV3.createGame(1, 100, 0, 1, { value: 100 }))
        .to.be.revertedWith('capacity must be greater than 1');
      
      // Testing invalid ticket price
      await expect(proxyAsV3.createGame(5, 0, 0, 1, { value: 0 }))
        .to.be.revertedWith("ticket price can't be zero");

      // Testing invalid number of tickets purchased
      await expect(proxyAsV3.createGame(5, 100, 0, 0, { value: 0 }))
        .to.be.revertedWith("creator must purchase at least 1 ticket");

      await expect(proxyAsV3.createGame(5, 100, 0, 6, { value: 600 }))
        .to.be.revertedWith("numTickets exceed available tickets");

      // Testing expired expiration
      await expect(proxyAsV3.createGame(5, 100, 1, 1, { value: 100 }))
        .to.be.revertedWith('expiration must be in the future');

      // Testing null expiration
      await expect(proxyAsV3.createGame(5, 100, 0, 1, { value: 100 }))
        .to.not.be.reverted;
    });
  });

  describe("Ticket Purchase", function () {
    async function createGameFixture() {
      const fixture = await loadFixture(deployProxyAsV3Fixture);
      const { proxyAsV3 } = fixture;

      const gameId = 0;
      const capacity = 5;
      const ticketPrice = 100;
      const numTickets = 1;
      const expiration = 2000000000;
  
      await proxyAsV3.createGame(
        capacity, ticketPrice, expiration, numTickets,
        { value: ticketPrice * numTickets }
      );

      return { ...fixture, gameId, capacity, ticketPrice, numTickets, expiration };
    }

    it("should allow a user to buy a ticket for an open game", async function() {
      const { proxyAsV3, accounts, gameId, ticketPrice, numTickets } = await loadFixture(createGameFixture);

      await proxyAsV3.buyTickets(gameId, 1, { value: ticketPrice });
      expect(await proxyAsV3.getParticipants(gameId))
        .to.have.length(numTickets+1)
        .and.to.deep.equal([accounts[0].address, accounts[0].address]);
    });
  
    it("should not allow a user to buy a ticket for a game that doesn't exist", async function() {
      const { proxyAsV3, ticketPrice } = await loadFixture(createGameFixture);
      const invalidGameId = 1;

      await expect(proxyAsV3.buyTickets(invalidGameId, 1, { value: ticketPrice }))
        .to.be.revertedWith("invalid ID");
    });
  
    it("should not allow a user to buy a ticket for a game that has ended", async function() {
      const { proxyAsV3, gameId, capacity, ticketPrice, numTickets } = await loadFixture(createGameFixture);

      // buy all available tickets
      const tickets = capacity-numTickets;
      await proxyAsV3.buyTickets(gameId, tickets, { value: tickets*ticketPrice });

      await expect(proxyAsV3.buyTickets(gameId, 1, { value: ticketPrice }))
        .to.be.revertedWith("game ended");
    });
  
    it("should not allow a user to buy a ticket for a game that has expired", async function() {
      const { proxyAsV3, gameId, ticketPrice, expiration } = await loadFixture(createGameFixture);
      
      time.increaseTo(expiration + 1);
      await expect(proxyAsV3.buyTickets(gameId, 1,{ value: ticketPrice }))
        .to.be.revertedWith("game expired");
    });
  
    it("should not allow a user to buy a ticket with an incorrect value", async function() {
      const { proxyAsV3, gameId, ticketPrice } = await loadFixture(createGameFixture);

      await expect(proxyAsV3.buyTickets(gameId, 1, { value: ticketPrice - 1 }))
        .to.be.revertedWith("you must send the exact ticket price");
      await expect(proxyAsV3.buyTickets(gameId, 1, { value: ticketPrice + 1 }))
        .to.be.revertedWith("you must send the exact ticket price");
    });
  
    it("should not allow a user to buy more tickets than available", async function() {
      const { proxyAsV3, gameId, capacity, ticketPrice, numTickets } = await loadFixture(createGameFixture);
      const tickets = capacity-numTickets + 1 // more than available 

      await expect(proxyAsV3.buyTickets(gameId, tickets, { value: tickets*ticketPrice }))
        .to.be.revertedWith("numTickets exceed available tickets");
    });
  
    it("should allow multiple users to buy tickets for the same game", async function() {
      const { proxyAsV3, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);

      for (let i = 0; i < capacity-1; i++) {
        await proxyAsV3.connect(accounts[i]).buyTickets(gameId, 1, { value: ticketPrice });
      }

      expect(await proxyAsV3.getParticipants(gameId)).to.deep.equal(
        [accounts[0].address, ...accounts.map(account => account.address).slice(0, capacity-1)]
      );
    });

    it("should emit a Winner event and transfer the prize to the winner when the game is full", async () => {
      const { proxyAsV3, accounts, gameId, capacity, ticketPrice, numTickets } = await loadFixture(createGameFixture);
      const prize = capacity * ticketPrice;

      // leave a single tickets
      const tickets = capacity-numTickets - 1;
      await proxyAsV3.buyTickets(gameId, tickets, { value: tickets*ticketPrice });

      await expect(proxyAsV3.buyTickets(gameId, 1, {value: ticketPrice }))
        .to.emit(proxyAsV3, "Winner").withArgs(0, accounts[0]) // gameId, address
        .and.to.changeEtherBalance(accounts[0], prize - ticketPrice);
    });

    describe("Ticket Refund", function () {

      it("should refund the tickets only once if a game has expired", async function() {
        const { proxyAsV3, gameId, ticketPrice, expiration, accounts } = await loadFixture(createGameFixture);
        
        await proxyAsV3.connect(accounts[1]).buyTickets(gameId, 1, { value: ticketPrice });
        await proxyAsV3.connect(accounts[2]).buyTickets(gameId, 1, { value: ticketPrice });
        await proxyAsV3.connect(accounts[2]).buyTickets(gameId, 1, { value: ticketPrice });
        
        await time.increaseTo(expiration + 1);
        await expect(proxyAsV3.refund(gameId)).to.changeEtherBalances(
          [accounts[0], accounts[1], accounts[2]],
          [ticketPrice, ticketPrice, ticketPrice*2]
        );

        const game = await proxyAsV3.games(0);
        expect(game.refunded).to.equal(true);

        await expect(proxyAsV3.refund(gameId)).to.be.revertedWith("tickets have been refunded");
      });
  
      it("should not refund the tickets if a game has not expired", async function() {
        const { proxyAsV3, gameId } = await loadFixture(createGameFixture);
        
        await expect(proxyAsV3.refund(gameId)).to.be.revertedWith("game has not expired");
      });
  
      it("should not refund the tickets if a game has ended", async function() {
        const { proxyAsV3, gameId, capacity, ticketPrice, numTickets } = await loadFixture(createGameFixture);
        
        // buy all available tickets
        const tickets = capacity-numTickets;
        await proxyAsV3.buyTickets(gameId, tickets, { value: tickets*ticketPrice });
  
        await expect(proxyAsV3.refund(gameId)).to.be.rejectedWith("game is complete");
      });
    });
  });
});