import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MiniLotto", function () {

  async function deployImplementationsFixture() {
    const accounts = await ethers.getSigners();

    const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

    const LottoV1 = await ethers.getContractFactory("MiniLottoV1");
    const lottoV1 = await LottoV1.deploy();

    const LottoV2 = await ethers.getContractFactory("MiniLottoV2");
    const lottoV2 = await LottoV2.deploy();

    return { lottoV1, lottoV2, accounts, IMPL_SLOT };
  }

  async function deployProxyAsV1Fixture() {
    const fixture = await loadFixture(deployImplementationsFixture);
    const { lottoV1 } = fixture;

    const Proxy = await ethers.getContractFactory("MiniLottoProxy");
    const proxy = await Proxy.deploy(lottoV1.address, []);

    // impose the logic interface over the proxy address
    // (trick to get ethers to run the logic function easily)
    const proxyAsV1 = await ethers.getContractAt("MiniLottoV1", proxy.address);

    return { ...fixture, proxy, proxyAsV1 };
  }

  async function deployProxyAsV2Fixture() {
    const fixture = await loadFixture(deployImplementationsFixture);
    const { lottoV2 } = fixture;

    const Proxy = await ethers.getContractFactory("MiniLottoProxy");
    const proxy = await Proxy.deploy(lottoV2.address, []);

    // impose the logic interface over the proxy address
    // (trick to get ethers to run the logic function easily)
    const proxyAsV2 = await ethers.getContractAt("MiniLottoV2", proxy.address);

    return { ...fixture, proxy, proxyAsV2 };
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
      const { proxy, lottoV1, lottoV2 } = await loadFixture(deployProxyAsV1Fixture);
      
      expect(proxy.address).to.not.be.null;
      expect(lottoV1.address).to.not.be.null;
      expect(lottoV2.address).to.not.be.null;
    });
  
    it('Should have MiniLottoV1 implementation', async function () {
      const { proxy, lottoV1, IMPL_SLOT } = await loadFixture(deployProxyAsV1Fixture);
      
      expect(await ethers.provider.getStorageAt(proxy.address, IMPL_SLOT))
        .to.deep.equal(ethers.utils.hexZeroPad(lottoV1.address, 32));
    });
  });

  describe("Upgrades", function () {
    it("Should not allow non admin to upgrade",async () => {
      const { proxyAsV1, lottoV2, accounts } = await loadFixture(deployProxyAsV1Fixture);
     
      await expect(proxyAsV1.connect(accounts[1]).upgradeTo(lottoV2.address))
        .to.be.revertedWith("unauthorized, admin only");
    });

    it("Should allow admin to upgrade",async () => {
      const { proxyAsV1, lottoV2, IMPL_SLOT } = await loadFixture(deployProxyAsV1Fixture);
      
      await expect(proxyAsV1.upgradeTo(lottoV2.address)).to.not.be.reverted;
      expect(await ethers.provider.getStorageAt(proxyAsV1.address, IMPL_SLOT))
        .to.deep.equal(ethers.utils.hexZeroPad(lottoV2.address, 32));
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
      const { proxyAsV1 } = await loadFixture(deployProxyAsV1Fixture);

      const capacity = 5;
      const ticketPrice = 100;
      const expiration = 2000000000;
  
      await expect(proxyAsV1.createGame(capacity, ticketPrice, expiration))
        .to.emit(proxyAsV1, "NewGame").withArgs(0);
  
      const game = await proxyAsV1.games(0);
      expect(game.capacity).to.equal(capacity);
      expect(game.ticketPrice).to.equal(ticketPrice);
      expect(game.expiration).to.equal(expiration);
      expect(await proxyAsV1.getParticipants(0)).to.have.length(0);
    });
  
    it('Should fail to create a new game with invalid parameters', async function () {
      const { proxyAsV1 } = await loadFixture(deployProxyAsV1Fixture);

      // Testing invalid capacity
      await expect(proxyAsV1.createGame(1, 100, 0)).to.be.revertedWith('capacity must be greater than 1');
      
      // Testing invalid ticket price
      await expect(proxyAsV1.createGame(5, 0, 0)).to.be.revertedWith("ticket price can't be zero");
      
      // Testing expired expiration
      await expect(proxyAsV1.createGame(5, 100, 1)).to.be.revertedWith('expiration must be in the future');

      // Testing null expiration
      await expect(proxyAsV1.createGame(5, 100, 0)).to.not.be.reverted;
    });
  });

  describe("Ticket Purchase", function () {
    async function createGameFixture() {
      const fixture = await loadFixture(deployProxyAsV2Fixture);
      const { proxyAsV2 } = fixture;

      const gameId = 0;
      const capacity = 5;
      const ticketPrice = 100;
      const expiration = 2000000000;
  
      await proxyAsV2.createGame(capacity, ticketPrice, expiration);

      return { ...fixture, gameId, capacity, ticketPrice, expiration };
    }

    it("should allow a user to buy a ticket for an open game", async function() {
      const { proxyAsV2, accounts, gameId, ticketPrice } = await loadFixture(createGameFixture);

      await proxyAsV2.buyTicket(gameId, { value: ticketPrice });
      expect(await proxyAsV2.getParticipants(gameId)).to.deep.equal([accounts[0].address]);
    });
  
    it("should not allow a user to buy a ticket for a game that doesn't exist", async function() {
      const { proxyAsV2, ticketPrice } = await loadFixture(createGameFixture);
      const invalidGameId = 1;

      await expect(proxyAsV2.buyTicket(invalidGameId, { value: ticketPrice })).to.be.revertedWith("invalid ID");
    });
  
    it("should not allow a user to buy a ticket for a game that has ended", async function() {
      const { proxyAsV2, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);

      for (let i = 0; i < capacity; i++) {
        await proxyAsV2.buyTicket(gameId, { value: ticketPrice, from: accounts[0].address });
      }
  
      await expect(proxyAsV2.buyTicket(gameId, { value: ticketPrice })).to.be.revertedWith("game ended");
    });
  
    it("should not allow a user to buy a ticket for a game that has expired", async function() {
      const { proxyAsV2, gameId, ticketPrice, expiration } = await loadFixture(createGameFixture);
      
      time.increaseTo(expiration + 1);
      await expect(proxyAsV2.buyTicket(gameId, { value: ticketPrice })).to.be.revertedWith("game expired");
    });
  
    it("should not allow a user to buy a ticket with an incorrect value", async function() {
      const { proxyAsV2, gameId, ticketPrice } = await loadFixture(createGameFixture);

      await expect(proxyAsV2.buyTicket(gameId, { value: ticketPrice - 1 })).to.be.revertedWith("you must send the exact ticket price");
      await expect(proxyAsV2.buyTicket(gameId, { value: ticketPrice + 1 })).to.be.revertedWith("you must send the exact ticket price");
    });
  
    it("should allow multiple users to buy tickets for the same game", async function() {
      const { proxyAsV2, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);

      for (let i = 0; i < capacity-1; i++) {
        await proxyAsV2.connect(accounts[i]).buyTicket(gameId, { value: ticketPrice });
      }

      expect(await proxyAsV2.getParticipants(gameId)).to.deep.equal(
        accounts.map(account => account.address).slice(0, capacity-1)
      );
    });

    it("should emit a Winner event and transfer the prize to the winner when the game is full", async () => {
      const { proxyAsV2, accounts, gameId, capacity, ticketPrice } = await loadFixture(createGameFixture);
      const prize = capacity * ticketPrice;

      for (let i = 0; i < capacity-1; i++) {
        await proxyAsV2.buyTicket(gameId, { value: ticketPrice, from: accounts[0].address });
      }
      await expect(proxyAsV2.buyTicket(gameId, {value: ticketPrice, from: accounts[0].address }))
        .to.emit(proxyAsV2, "Winner")
        .withArgs(accounts[0], prize)
        .and.to.changeEtherBalance(accounts[0], prize - ticketPrice);
    });

    describe("Ticket Refund", function () {

      it("should refund the tickets if a game has expired", async function() {
        const { proxyAsV2, gameId, ticketPrice, expiration, accounts } = await loadFixture(createGameFixture);
        
        await proxyAsV2.buyTicket(gameId, { value: ticketPrice }); // account 0
        await proxyAsV2.connect(accounts[1]).buyTicket(gameId, { value: ticketPrice });
        await proxyAsV2.connect(accounts[2]).buyTicket(gameId, { value: ticketPrice });
        await proxyAsV2.connect(accounts[2]).buyTicket(gameId, { value: ticketPrice });
        
        await time.increaseTo(expiration + 1);
        await expect(proxyAsV2.refund(gameId)).to.changeEtherBalances(
            [accounts[0], accounts[1], accounts[2]],
            [ticketPrice, ticketPrice, ticketPrice*2]
          );
      });
  
      it("should not refund the tickets if a game has not expired", async function() {
        const { proxyAsV2, gameId } = await loadFixture(createGameFixture);
        
        await expect(proxyAsV2.refund(gameId))
          .to.be.revertedWith("game has not expired");
      });
  
      it("should not refund the tickets if a game has ended", async function() {
        const { proxyAsV2, gameId, capacity, ticketPrice, expiration, accounts } = await loadFixture(createGameFixture);
        
        for (let i = 0; i < capacity; i++) {
          await proxyAsV2.buyTicket(gameId, { value: ticketPrice });
        }
  
        await expect(proxyAsV2.refund(gameId))
          .to.be.rejectedWith("prize has been distributed");
      });
    });
  });
});