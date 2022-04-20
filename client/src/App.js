import React, { Component } from "react";
import Voting from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  //state = { storageValue: 0, web3: null, accounts: null, contract: null };
  state = { web3: null, accounts: null, contract: null, owner:null };


  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

        
    

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Voting.networks[networkId];
      const instance = new web3.eth.Contract(
        Voting.abi,
        deployedNetwork && deployedNetwork.address,
      );

        

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.getOwner);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

    getOwner = async () => {
        //const { accounts, contract } = this.state;
        const { contract } = this.state;
        // Get contract owner's address
        const owner = await contract.methods.owner().call();
        this.setState({ owner });
        // Stores a given value, 5 by default.
        // await contract.methods.set(5).send({ from: accounts[0] });
        // Get the value from the contract to prove it worked.
        //const response = await contract.methods.get().call();
        // Update state with the result.
        //this.setState({ storageValue: response });
    };

  render() {



    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    else {
        window.ethereum.on('accountsChanged', (accounts) => {
            this.setState({ accounts });
            console.log('account changed');
            this.render();
            // Time to reload your interface with accounts[0]!
        })
        /*
        this.state.web3.on('accountsChanged', ()=>{
            console.log('account changed!');
        });*/
        return (
            <div className="App">
                <Greeter
                    owner={this.state.owner}
                    user={this.state.accounts[0]}
                />
                <h1>Good to Go!</h1>
                <div>Welcome: {this.state.accounts[0]}</div>
                <div>Owner: {this.state.owner}</div>
            </div>
        );
    }
   
  }
}

class Greeter extends Component {
    render() {
        if (this.props.owner && this.props.owner.toLowerCase() == this.props.user.toLowerCase()) {
            return (
                <div>
                    Bienvenue ADMIN
                </div>
            );
        }
        return (
            <div>
                Bienvenue Inconnu
            </div>
        );
    };
}

export default App;
