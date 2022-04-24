# Voting Dapp

## 1. Smart Contract Audit

In order to prevent the *out to gas* vunerability :
It's been decided to restrict the number of allowed voters, each voter can then submit a single proposal.
This solution was more equitable than restricting the number of proposals, since a voter could have submitted several proposals, and not every voter would be able to submit a proposal.

## 2. Smart Contract Security Fix

In order to prevent this vunerability :

1. the variable **nbrVotersMax** has been added (it has to be set/verified before deployment)
2. the variable **nbrVoters** has been added (set to 0)
3. the function **addVoter()** checks that **nbrVotersMax** is greater than **nbrVoters** before registering a voter
4. the function **addVoter()** increments **nbrVoters** when a voter is registered
5. the variable **hasSubmitted** (set to *false*) has been added to the **voter** structure
6. the function **addProposal()** checks that **hasSubmitted** is *false* before registering a proposal
7. the function **addProposal()** sets **hasSubmitted** to *true* when a proposal is registered

## 3. Dapp workflow & demo

See video at: YOUTUBE

## 4. Contract & Dapp deployement

Contract has been deployed on Kovan network at 0x33Ae605BE9128fAbb841C030915eeE278f8F942D

See on Etherscan: https://kovan.etherscan.io/address/0x33Ae605BE9128fAbb841C030915eeE278f8F942D

The live dapp is running at: https://voting-dapp-olive.vercel.app

Send me your address on discord if you want to be added as a voter :)