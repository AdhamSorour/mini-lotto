<p  align="center">
	<img  src="https://raw.githubusercontent.com/AdhamSorour/mini-lotto/main/app/public/lotto.svg"  alt= “minilotto_logo”  width="150"  height="150">
</p>

<h3 align="center">Create and participate in mini lottery games on EVM-compatible chains</h3>
<h4 align="center">&#8226;&ensp; Sepolia &ensp;&#8226;&ensp; Goerli &ensp;&#8226;&ensp; Mumbai &ensp;&#8226;&ensp; Polygon &ensp;&#8226; </h4>

# Overview

Each lottery has 2 required parameters that must be set by the creator:

- capacity - the number of tickets available
- ticket price - the price of a single ticket

Once capacity is reached (all tickets have been bought), the prize is automatically awarded to a random winner from the pool of ticket owners. The more tickets you buy, the higher your chances of winning. To accommodate concerns about capacity never being reached, an **optional** third parameter may be specified:

- expiry - time at which the prize may be distributed if capacity was not reached

This prevents funds from being stuck in the smart contract if a lottery never sells all its available tickets. The winner is also selected at random from the pool of participants.
  
The prize awarded for a given lottery is the product of the number of tickets bought and the ticket price - all deposited funds go to the winner.
  
# Usage

There are three states a lottery can be in:
* Active
* Expired
* Complete

Each lottery card has its status written at the top along with its ID (top left) and the number of tickets sold (top right). Tickets can only be bought in active lotteries. I'm using the alchemy-sdk to fetch the data so you don't need a wallet to browse the games but you do need a browser wallet (preferably MetaMask) to participate.

### Ticket Purchase

There are no limits on the number of tickets a user can buy, your odds of winning a given lottery are directly proportional to the number of tickets you buy. However, the amount of money you win is inversely proportional to the number of tickets you buy. For example, in a lottery with 10 tickets costing 0.1 ETH each, if you buy 9 tickets your odds of winning are 9/10, however you'd only make 0.1 ETH (~11%) (minus gas which is negligible in most cases). If instead you buy just 1 ticket your odds of winning would be 1/10 but you'd win 0.9 ETH (900%). 

### Game Creation

Game creation requires that the user purchases at least on ticket. This is to prevent the unneccessary creation of many empty lottery games. To create a new lottery press on the big Mini Lotto button on the bottom right.

# Technicalities

### Expired Games

The EVM is a transaction-based state machine - anything that happens on the blockchain must be initiated by a transaction. Since no transactions initiate the expiry (it's just a timestamp), when a lottery expires the user must manually initiate the prize distribution. On the dashboard expired games will have a "Distribute Prize" button that will distribute the prize to a random winner from the participants. Anyone can press the button, but usually only users who bought tickets would be motivated to do so since a small gas fee will be incurred. 

Also keep in mind that the prize for expired games will not match the prize displayed on the card since that is based on the game capacity (which had not been reached). It will instead equal the number of tickets bought (shown on the top right) multiplied by the ticket price.
 
### Random Selection

The buyer of each ticket is added to a pool and, when the prize is distributed, the funds are sent to a random address selected from the pool. Sort of like a raffle. Under the hood this is implemented as a simple dynamic array - if you buy 5 tickets, there will 5 entries of your address in the pool array. The random index is generated using the hash of the block timestamp, address pool, and a counter/nonce. This makes it **very difficult** to predict or control the outcome, but not impossible. True randomness is impossible to achieve on-chain due to the blockchain's deterministic nature, other solutions that accomplish this are discussed in [Potential Improvements](#potential-improvements).

# Development

### Project Structure
```
├── app						Next13 app (uses the new app directory)
├── contracts				Openzeppelin UUPS proxy pattern
│   ├── MiniLottoVx.sol		the implementation contract version x 		
│   ├── MiniLottoProxy.sol	the proxy contract
├── test					Hardhat test suite
├── hardhat.config.ts		Hardhat config file (has custom tasks and network info)
```

### Running Locally

1. clone the project: `git clone git@github.com:AdhamSorour/mini-lotto.git`
2. install the root dependencies: `cd mini-lotto && npm install`
3. install the app dependencies: `cd app && npm install`
4. create two `.env` files and define the following:
	* `/.env`
		* PRIVATE_KEY
		* ALCHEMY_GOERLI_URL
		* ALCHEMY_SEPOLIA_URL
		* ALCHEMY_POLYGON_MUMBAI_URL
		* ALCHEMY_POLYGON_MAINNET_URL
		* ETHERSCAN_KEY
	* `/app/.env`
		* NEXT_PUBLIC_ALCHEMY_GOERLI_API_KEY
		* NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY
		* NEXT_PUBLIC_ALCHEMY_POLYGON_MUMBAI_API_KEY
		* NEXT_PUBLIC_ALCHEMY_POLYGON_MAINNET_API_KEY
5. run the app: `npm run dev`
6. view it on [localhost:3000](http://localhost:3000/) 
 
### Hardhat Tasks

I created the following custom Hardhat tasks in `/hardhat.config.ts` to help with development:

* estimateGas
* deployImplementation
* deployProxy
* upgrade

I also overriden the `compile` task to cp the latest Artifact to the app directory. When creating new implementation versions make sure to update this task to copy the right contract version.'

To view the description and parameters of a specific task: `npx hardhat help <task_name>`
To view all the available tasks (including built-in tasks): `npx hardhat help`

# Potential Improvements

### External source of randomness

One way to acheive true randomness is to use an oracle like Chainlink's [Verifiable Random Function (VRF)](https://chain.link/vrf?&utm_medium=paid-search&utm_source=google&utm_term=vrf&agid=bbe5sc6y0fzr&cnid=a7lcqb229rie&gclid=EAIaIQobChMIj5HN26yA_gIVQyc4Ch0c4wigEAAYASAAEgI2xvD_BwE). This uses off-chain data to calculate truly random numbers to use in our contract when needed. 


### Uneven ticket purchase gas cost

Due to the game mechanics and the varying amount of code executed during the different function calls, gas costs for purchasin a ticket will not be equal across all the participants. I am talking here about the *amount of gas* used not the price of gas. Namely, there are three different gas costs to buying a lottery ticket:

* the first ticket(s) ~ 162164 gas
	
	when creating a new lottery the game creator must buy at least one ticket, however, since a new game struct is being created and stored during that same transaction, the gas cost is higher than other tickets bought
	
* the final ticket(s) ~ 116284 gas

	since the prize is automatically distributed as soon as the final ticket is purchased, the gas costs for calculating the random winner and sending them the prize are including in the gas costs for purchasing the final ticket

* all other tickets ~ 94093 gas

	all other tickets have cost slightly less gas because they involve no extra processing outside of registering the ticket buyer


An improvement would somehow deal with this fact and adjust the ticket prices slightly to equalize the gas paid across all tickets. However it is safe to say that if your dealing with ticket prices above 0.001 on all the supported chains these differences will be negligible.


