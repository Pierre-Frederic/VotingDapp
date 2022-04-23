import React, { Component } from "react";
import Voting from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {

    state = {
        web3: null,
        accounts: null,
        contract: null,
        owner: null,
        user: null,
        workflowStatus: null,
        voters: [],
        proposals: [],
        loaded: false
    };

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
            this.setState({ web3, accounts, contract: instance }, this.runInit);

            // ADD EVENT LISTENERS
            this.state.contract.events.WorkflowStatusChange({
                //filter: { myIndexedParam: [20, 23], myOtherIndexedParam: '0x123456789...' }, // Using an array means OR: e.g. 20 or 23
                //fromBlock: 0
            }).on('data', (event) => {
                this.getWorkflowStatus();
            });

            this.state.contract.events.VoterRegistered({
                //filter: { myIndexedParam: [20, 23], myOtherIndexedParam: '0x123456789...' }, // Using an array means OR: e.g. 20 or 23
                //fromBlock: 0
            }).on('data', async (event) => {
                await this.getVoters();
                await this.getUser();
            });

            this.state.contract.events.ProposalRegistered({
                //filter: { myIndexedParam: [20, 23], myOtherIndexedParam: '0x123456789...' }, // Using an array means OR: e.g. 20 or 23
                //fromBlock: 0
            }).on('data', async (event) => {
                await this.getProposals();
                await this.getUser();
            });

            this.state.contract.events.Voted({
                //filter: { myIndexedParam: [20, 23], myOtherIndexedParam: '0x123456789...' }, // Using an array means OR: e.g. 20 or 23
                //fromBlock: 0
            }).on('data', async (event) => {
                const userSum = web3.utils.toChecksumAddress(this.state.user.address);
                const voterSum = web3.utils.toChecksumAddress(event.returnValues.voter);
                if (userSum === voterSum) {
                    await this.getUser();
                }
            });

            window.ethereum.on('accountsChanged', (accounts) => {
                this.setState({ accounts });
                this.getUser();
                this.render();
            });

        } catch (error) {
            // Catch any errors for any of the above operations.
            alert(
            `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    runInit = async () => {
        await this.getOwner();
        await this.getWorkflowStatus();
        await this.getVoters();
        await this.getProposals();
        await this.getUser();
        this.setState({ loaded: true });
    }

    getOwner = async () => {
        const { contract } = this.state;
        const owner = await contract.methods.owner().call();
        this.setState({ owner });
    };

    getWorkflowStatus = async () => {
        const { contract } = this.state;
        const res = await contract.methods.workflowStatus().call();
        const workflowStatus = parseInt(res);
        this.setState({ workflowStatus });
    }

    getWorkflowDescription = (workflowStatus) => {
        let workflowDescription = [
            'enregistrement des votants',
            'enregistrement des propositions',
            'fin des propositions',
            'enregistrement des votes',
            'fin des votes',
            'résultat du vote'
        ];
        return workflowDescription[workflowStatus];
    }

    getVoters = async () => {
        const { contract } = this.state;
        let events = await contract.getPastEvents('VoterRegistered', {
            fromBlock: 0,
            toBlock: 'latest'
        });
        let voters = [];
        for (const event of events) {
            voters.push(event.returnValues.voterAddress);
        }
        this.setState({ voters });
    };

    getVoterDetails = async (address) => {
        const { contract, accounts } = this.state;
        const details = await contract.methods.getVoter(address).call({ from: accounts[0] });
        return details;        
    }

    getProposals = async () => {
        const { contract } = this.state;
        let events = await contract.getPastEvents('ProposalRegistered', {
            fromBlock: 0,
            toBlock: 'latest'
        });
        let proposals = [];
        for (const event of events) {
            proposals.push(event.returnValues.proposalId);
        }
        this.setState({ proposals });
    };

    

    getUser = async () => {

        const { web3, owner, accounts, voters } = this.state;

        let user = {
            address: accounts[0],
            isOwner: false,
            isVoter: false,
            hasVoted: false,
            hasSubmitted: false,
            votedProposalId: "0"
        }
        const userSum = web3.utils.toChecksumAddress(user.address);
        const ownerSum = web3.utils.toChecksumAddress(owner);
        if (userSum === ownerSum) {
            user.isOwner = true;
        }
        for (const voter of voters) {
            if (userSum === web3.utils.toChecksumAddress(voter)) {
                user.isVoter = true;
            }
        }
        if (user.isVoter) {
            let details = await this.getVoterDetails(user.address);
            user.hasVoted = details['hasVoted'];
            user.hasSubmitted = details['hasSubmitted'];
            user.votedProposalId = details['votedProposalId'];
        }
        this.setState({ user });
    }

    nextStep = async () => {
        const { contract, accounts, workflowStatus } = this.state;
        switch (workflowStatus) {
            case 0:
                await contract.methods.startProposalsRegistering().send({from: accounts[0]});
                break;
            case 1:
                await contract.methods.endProposalsRegistering().send({ from: accounts[0] });
                break;
            case 2:
                await contract.methods.startVotingSession().send({ from: accounts[0] });
                break;
            case 3:
                await contract.methods.endVotingSession().send({ from: accounts[0] });
                break;
            case 4:
                await contract.methods.tallyVotes().send({ from: accounts[0] });
                break;
            default:
                break;
        }
    }

    addVoter = async (event) => {
        event.preventDefault();
        const { contract, accounts, web3 } = this.state;
        let address = document.querySelector('#newVoterAddress').value;
        if (web3.utils.isAddress(address)){
            await contract.methods.addVoter(address).send({ from: accounts[0] });
        }
        document.querySelector('#newVoterAddress').value = '';
    }

    addProposal = async (event) => {
        event.preventDefault();
        const { contract, accounts } = this.state;
        let description = document.querySelector('#newProposalDescription').value;
        await contract.methods.addProposal(description).send({ from: accounts[0] });
        document.querySelector('#newProposalDescription').value = '';
    }

    render() {
        
        if (!this.state.web3 || !this.state.loaded) {
            return <Loading></Loading>;
        }

        return (
            <div className="App">
                <div className="Header">
                    <span className="Id">
                        {this.state.accounts[0]}
                        {this.state.user.isOwner &&
                            <div className="Admin">admin</div>
                        }
                    </span>
                    Voting Dapp
                </div>
                <Workflow
                    user={this.state.user}
                    nextStep={this.nextStep}
                    workflowStatus={this.state.workflowStatus}
                    getWorkflowDescription={this.getWorkflowDescription}
                >
                </Workflow>
                <div className="Main">
                    <h1>
                        {this.getWorkflowDescription(this.state.workflowStatus)}
                    </h1>
                    {this.state.workflowStatus === 0 &&
                        <section>
                            {this.state.user.isOwner &&
                                <div>
                                    <form onSubmit={this.addVoter}>
                                        <label>
                                            indiquez une adresse à ajouter
                                            <input type="text" id="newVoterAddress" defaultValue="" />
                                        </label>
                                        <input type="submit" value="valider" className="Ajoute" />
                                    </form>
                                    <br />
                                    <Voters voters={this.state.voters}></Voters>
                                </div>
                            }
                            {!this.state.user.isOwner &&
                                <NotAllowed></NotAllowed>
                            }
                        </section>
                    }
                    
                    {this.state.workflowStatus === 1 && 
                        <section>
                            {this.state.user.isOwner && this.state.proposals.length === 0 &&
                                <p className="Alert">
                                    aucune proposition enregistrée
                                </p>
                            }
                            {this.state.user.isOwner && this.state.proposals.length > 0 &&
                                <p className="Info">
                                    { this.state.proposals.length + " " }
                                    propositions enregistrées
                                </p>
                            }
                            {this.state.user.isVoter && !this.state.user.hasSubmitted &&
                                <div>
                                    <FormProposal
                                        user={this.state.user}
                                        addProposal={this.addProposal}
                                        getVoterDetails={this.getVoterDetails}
                                        >
                                    </FormProposal>
                                </div>
                            }
                            {this.state.user.isVoter && this.state.user.hasSubmitted &&
                                <div>
                                    <p className="Validate">
                                        Votre proposition a été enregistrée
                                    </p>
                                </div>
                            }
                        </section>
                    }

                    {this.state.workflowStatus === 2 &&
                        <div>
                            {this.state.user.isVoter && 
                                <div>
                                    <p className="Info">
                                        Le vote n'est pas encore ouvert
                                    </p>
                                    <ProposalsList
                                        proposals={this.state.proposals}
                                        contract={this.state.contract}
                                        accounts={this.state.accounts}
                                        voting={false}
                                        >
                                    </ProposalsList>
                                </div>
                            }
                            {!this.state.user.isVoter &&
                                <NotAllowed></NotAllowed>
                            }
                        </div>
                    }

                    {this.state.workflowStatus === 3 &&
                        <div>
                            {this.state.user.isVoter && !this.state.user.hasVoted &&
                                <div>
                                    <p className="Info">
                                        Le vote est ouvert
                                    </p>
                                    <ProposalsList
                                        proposals={this.state.proposals}
                                        contract={this.state.contract}
                                        accounts={this.state.accounts}
                                        voting={true}
                                    >
                                    </ProposalsList>
                                </div>
                            }
                            {this.state.user.isVoter && this.state.user.hasVoted &&
                                <p className="Validate">
                                    Votre vote a été enregistré
                                </p>
                            }
                            {!this.state.user.isVoter &&
                                <NotAllowed></NotAllowed>
                            }
                        </div>
                    }

                    {this.state.workflowStatus === 4 &&
                        <div>
                            {this.state.user.isVoter &&
                                <div>
                                    <p className="Info">
                                        Le vote est terminé
                                    </p>
                                    <br/>
                                    <br/>
                                    Les résultats ne devraient pas tarder à
                                    être publiés.
                                </div>
                            }
                            {!this.state.user.isVoter &&
                                <NotAllowed></NotAllowed>
                            }
                        </div>
                    }

                    {this.state.workflowStatus === 5 &&
                        <section>
                            {this.state.user.isVoter &&
                                <div>
                                    La proposition gagnante est :
                                    <br />
                                    <br />
                                    <Winner
                                        contract={this.state.contract}
                                        accounts={this.state.accounts}
                                    >
                                    </Winner>
                                </div>
                            }
                            {!this.state.user.isVoter &&
                                <NotAllowed></NotAllowed>
                            }
                        </section>
                    }
                </div>
            </div>
        );
    }
}

class Workflow extends Component {
    getClass(workflowStatus) {
        if (this.props.workflowStatus === workflowStatus){
            return 'pending';
        } else if (this.props.workflowStatus > workflowStatus) {
            return 'done';
        }
        return '';
    }
    getStep(workflowStatus){
        let button = '';
        if (this.props.user.isOwner && workflowStatus == this.props.workflowStatus && workflowStatus < 5){
            button = <button className="Next" onClick={this.props.nextStep}>suivant</button>;
        }
        return(
            <li className={this.getClass(workflowStatus)}>
                {this.props.getWorkflowDescription(workflowStatus)}
                {button}
            </li>
        )
    }
    render() {
        return(
            <ul className="Workflow">
                {this.getStep(0)}
                {this.getStep(1)}
                {this.getStep(2)}
                {this.getStep(3)}
                {this.getStep(4)}
                {this.getStep(5)}
            </ul>
        )
    }
    
}

class Voters extends Component {
    render() {
        if (this.props.voters.length === 0) {
            return <p className="Alert">aucun votant enregistré</p>
        } else {
            return (
                <ul className="Voters">
                    {this.props.voters.map((address) => (
                        <li key={address}>{address}</li>
                    ))}
                </ul>
            )
        }
    }
}

class ProposalsList extends Component {

    vote = async (proposalId) => {
        const contract = this.props.contract;
        const accounts = this.props.accounts;
        await contract.methods.setVote(proposalId).send({ from: accounts[0] });        
    }

    render() {
        if (this.props.proposals.length === 0) {
            return <div>AUCUNE PROPOSITION ENREGISTRÉE</div>
        } else {
            return (
                <div>
                    <br/>
                    Voici l'ensemble des propositions qui ont été proposées :
                    <br/>
                    <br/>
                    <ul className="Proposals">
                        {this.props.proposals.map((proposalId) => (                        
                            <li key={proposalId}>
                                {this.props.voting &&
                                    <button className="Vote"
                                        onClick={() => this.vote(proposalId)}
                                    >
                                        voter
                                    </button>
                                }
                                <Proposal 
                                    proposalId={proposalId}
                                    contract={this.props.contract}
                                    accounts={this.props.accounts}
                                >
                                </Proposal>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        }
    }
}

class Winner extends Component {

    state = {
        loaded: false,
        proposalId: null
    }

    componentDidMount = async () => {
        await this.getWinner();
        this.setState({ loaded: true });
    }

    displayWinner = () => {
        if(this.state.loaded){
            return (
                <ul className="Proposals">
                    <li>
                        <Proposal
                            proposalId={this.state.proposalId}
                            contract={this.props.contract}
                            accounts={this.props.accounts}
                            voteCount={true}
                        >
                        </Proposal>
                    </li>
                </ul>
            )
        }
        return (
            <Loading>
                chargement en cours...
            </Loading>
        )
    }

    getWinner = async () => {
        const contract = this.props.contract;
        const proposalId = await contract.methods.winningProposalID().call();
        this.setState({ proposalId });
    }

    render() {
        return this.displayWinner();
    }
}

class Proposal extends Component {
    
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            proposalId: this.props.proposalId,
            description: null,
            voteCount: null
        };
    }

    componentDidMount = async () => {
        const details = await this.getDetails(this.state.proposalId);
        let description = details['description'];
        let voteCount = details['voteCount'];
        let loaded = true;
        this.setState({ loaded, description, voteCount });
    }

    getDetails = async (proposalId) => {
        const contract = this.props.contract;
        const accounts = this.props.accounts;
        let details = await contract.methods.getOneProposal(proposalId).call({ from: accounts[0] });
        return details;
    }
    
    displayDetails = () => {
        if (this.state.loaded) {
            return (
                <div>
                    <b>Proposition #{this.state.proposalId}</b><br />
                    {this.state.description}
                    {this.props.voteCount &&
                        <span className="VoteCount">
                            ({this.state.voteCount} votes)
                        </span>
                    }
                </div>
            );
        }
        return 'chargement...';
    }

    render() {
        return this.displayDetails();
    }
}

class FormProposal extends Component {
    
    render() {
        return (
            <form onSubmit={this.props.addProposal}>
                <label>votre proposition</label>
                <input type="text" id="newProposalDescription" defaultValue="" />
                <input type="submit" value="valider" className="Ajoute" />
            </form>
        )
    }
}

class NotAllowed extends Component {
    render() {
        return (
            <p className="Alert">
                Vous n'êtes pas autorisé à consulter cette section
            </p>
        )
    }
}

class Loading extends Component {
    render() {
        return (
            <div className="Loading">
                chargement en cours...
            </div>
        )
    }
}

export default App;
